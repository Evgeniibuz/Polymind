"""Signal generation & bot execution tasks."""

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import session_scope
from app.models.market import MarketStatus
from app.models.position import PositionDirection, PositionStatus
from app.services.bot_service import BotService
from app.services.signal_service import SignalService
from app.services.trading_service import TradingService

logger = get_logger(__name__)


async def generate_signals(ctx: dict) -> dict:
    """Run the probability engine over top active markets and create signals.

    Limits to top-N by volume to control LLM cost.
    """
    from sqlalchemy import select

    from app.models.market import Market

    max_markets = ctx.get("max_markets", 25)

    async with session_scope() as db:
        result = await db.execute(
            select(Market)
            .where(Market.status == MarketStatus.ACTIVE)
            .where(Market.yes_price.isnot(None))
            .order_by(Market.volume_24h.desc())
            .limit(max_markets)
        )
        markets = list(result.scalars().all())

        service = SignalService(db)
        created = 0
        for market in markets:
            try:
                signal = await service.generate_for_market(market)
                if signal:
                    created += 1
                    # Auto-execute for matching bots
                    if settings.is_production or ctx.get("auto_execute"):
                        await _dispatch_to_bots(db, signal)
            except Exception as e:
                logger.warning(
                    "signal.generate.error",
                    market=market.question[:60],
                    error=str(e),
                )

    logger.info("signals.batch.complete", created=created, scanned=len(markets))
    return {"created": created, "scanned": len(markets)}


async def _dispatch_to_bots(db, signal) -> None:
    """Find matching bots and open positions for auto-execute bots."""
    bot_service = BotService(db)
    trading = TradingService(db)
    matched = await bot_service.find_matching_bots(signal)

    for bot in matched:
        if not bot.auto_execute:
            continue
        # Size: min(max_position, remaining capital fraction)
        size = min(
            float(bot.max_position_usd),
            float(bot.capital_allocated) * 0.1,
        )
        try:
            await trading.open_position(
                user_id=bot.user_id,
                market=signal.market,
                direction=PositionDirection(signal.direction.value if hasattr(signal.direction, "value") else signal.direction),
                size_usd=size,
                signal=signal,
                bot=bot,
                stop_loss_pct=bot.stop_loss_pct,
                take_profit_pct=bot.take_profit_pct,
            )
            bot.open_positions += 1
            bot.total_trades += 1
            await bot_service.record_run(bot)
        except Exception as e:
            logger.warning(
                "bot.execute.error", bot_id=str(bot.id), error=str(e)
            )


async def expire_signals(ctx: dict) -> dict:
    async with session_scope() as db:
        count = await SignalService(db).expire_stale()
    return {"expired": count}


async def rollup_bot_stats(ctx: dict) -> dict:
    """Recompute per-bot performance metrics from positions."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import func, select

    from app.models.bot import Bot
    from app.models.position import Position

    async with session_scope() as db:
        bots = list((await db.execute(select(Bot))).scalars().all())
        day_ago = datetime.now(timezone.utc) - timedelta(hours=24)

        for bot in bots:
            # Open positions count
            open_count = await db.scalar(
                select(func.count(Position.id)).where(
                    Position.bot_id == bot.id,
                    Position.status == PositionStatus.OPEN,
                )
            )
            # Realized PnL (all time)
            realized = await db.scalar(
                select(func.coalesce(func.sum(Position.realized_pnl_usd), 0)).where(
                    Position.bot_id == bot.id,
                    Position.status == PositionStatus.CLOSED,
                )
            )
            # 24h PnL %
            pnl_24h = await db.scalar(
                select(func.coalesce(func.sum(Position.realized_pnl_usd), 0)).where(
                    Position.bot_id == bot.id,
                    Position.status == PositionStatus.CLOSED,
                    Position.closed_at >= day_ago,
                )
            )
            # Win rate
            total_closed = await db.scalar(
                select(func.count(Position.id)).where(
                    Position.bot_id == bot.id,
                    Position.status == PositionStatus.CLOSED,
                )
            )
            wins = await db.scalar(
                select(func.count(Position.id)).where(
                    Position.bot_id == bot.id,
                    Position.status == PositionStatus.CLOSED,
                    Position.realized_pnl_usd > 0,
                )
            )

            bot.open_positions = int(open_count or 0)
            bot.pnl_total_usd = realized or 0
            cap = float(bot.capital_allocated or 1)
            bot.pnl_24h_pct = round(float(pnl_24h or 0) / cap * 100, 2) if cap else 0
            bot.win_rate = round((wins or 0) / total_closed * 100, 1) if total_closed else 0
            bot.total_trades = int(total_closed or 0)

        await db.commit()

    return {"bots_updated": len(bots)}


async def mark_positions(ctx: dict) -> dict:
    """Update unrealized PnL + check stop-loss/take-profit triggers."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.models.position import Position

    async with session_scope() as db:
        result = await db.execute(
            select(Position)
            .options(selectinload(Position.market))
            .where(Position.status == PositionStatus.OPEN)
        )
        positions = list(result.scalars().all())
        trading = TradingService(db)

        closed = 0
        for pos in positions:
            await trading.mark_to_market(pos)
            # Check exit triggers
            if pos.current_price is not None:
                if pos.stop_loss_price and pos.current_price <= pos.stop_loss_price:
                    await trading.close_position(pos, reason="stop_loss")
                    closed += 1
                elif pos.take_profit_price and pos.current_price >= pos.take_profit_price:
                    await trading.close_position(pos, reason="take_profit")
                    closed += 1

    return {"marked": len(positions), "closed": closed}
