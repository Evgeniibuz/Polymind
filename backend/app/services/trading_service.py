"""Trading service — opens, monitors, and closes positions.

For MVP this writes positions to the DB and (optionally) routes to Polymarket CLOB.
Pure paper-trading mode if POLYMARKET_PRIVATE_KEY is not set.
"""

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.integrations.polymarket_clob import (
    PolymarketTradingError,
    get_clob_client,
)
from app.models.bot import Bot
from app.models.market import Market
from app.models.position import Position, PositionDirection, PositionStatus
from app.models.signal import Signal

logger = get_logger(__name__)


class TradingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def open_position(
        self,
        *,
        user_id: UUID,
        market: Market,
        direction: PositionDirection,
        size_usd: float,
        signal: Signal | None = None,
        bot: Bot | None = None,
        stop_loss_pct: float | None = None,
        take_profit_pct: float | None = None,
    ) -> Position:
        """Open a new position. Routes through CLOB if configured, else paper-trade."""

        entry_price = (
            market.yes_price if direction == PositionDirection.YES else (1.0 - (market.yes_price or 0.5))
        )
        if entry_price is None or entry_price <= 0:
            raise ValueError("market has no valid price")

        stop_price = None
        if stop_loss_pct:
            stop_price = entry_price * (1 - stop_loss_pct / 100)
        take_price = None
        if take_profit_pct:
            take_price = entry_price * (1 + take_profit_pct / 100)

        position = Position(
            user_id=user_id,
            bot_id=bot.id if bot else None,
            market_id=market.id,
            signal_id=signal.id if signal else None,
            direction=direction,
            status=PositionStatus.PENDING,
            size_usd=Decimal(str(size_usd)),
            entry_price=entry_price,
            stop_loss_price=stop_price,
            take_profit_price=take_price,
        )
        self.db.add(position)
        await self.db.commit()
        await self.db.refresh(position)

        # Route to live trading if private key configured
        if settings.polymarket_private_key:
            await self._submit_to_clob(position, market)
        else:
            # Paper trade: mark filled at entry_price
            position.status = PositionStatus.OPEN
            position.shares = Decimal(str(size_usd)) / Decimal(str(entry_price))
            position.current_price = entry_price
            position.opened_at = datetime.now(timezone.utc)
            await self.db.commit()
            logger.info(
                "position.paper.opened",
                position_id=str(position.id),
                size=size_usd,
                entry=entry_price,
            )

        return position

    async def _submit_to_clob(self, position: Position, market: Market) -> None:
        """Submit market order to Polymarket CLOB."""
        # Polymarket markets have two token_ids: one for YES, one for NO.
        # These are exposed via the Gamma `clobTokenIds` field. We assume
        # market.raw contains it.
        try:
            token_ids = market.raw.get("clobTokenIds") if market.raw else None
            if isinstance(token_ids, str):
                import orjson
                token_ids = orjson.loads(token_ids)
            if not token_ids or len(token_ids) < 2:
                raise PolymarketTradingError("market missing clobTokenIds")

            token_id = (
                token_ids[0] if position.direction == PositionDirection.YES else token_ids[1]
            )
            clob = get_clob_client()
            receipt = await clob.place_market_order(
                token_id=token_id,
                side="BUY",
                size_usd=float(position.size_usd),
            )
            position.status = PositionStatus.OPEN
            position.tx_hash_open = receipt.get("transactionHash") or receipt.get("orderID")
            position.opened_at = datetime.now(timezone.utc)
            position.meta = {"clob_receipt": receipt}
            await self.db.commit()
            logger.info(
                "position.live.opened",
                position_id=str(position.id),
                tx=position.tx_hash_open,
            )
        except Exception as e:
            position.status = PositionStatus.FAILED
            position.error_message = str(e)[:512]
            await self.db.commit()
            logger.error(
                "position.live.failed",
                position_id=str(position.id),
                error=str(e),
            )
            raise

    async def mark_to_market(self, position: Position) -> None:
        """Update current_price + unrealized_pnl from latest market data."""
        result = await self.db.execute(
            select(Market).where(Market.id == position.market_id)
        )
        market = result.scalar_one_or_none()
        if market is None or market.yes_price is None:
            return

        current = (
            market.yes_price
            if position.direction == PositionDirection.YES
            else (1.0 - market.yes_price)
        )
        position.current_price = current
        if position.shares:
            current_value = float(position.shares) * current
            position.unrealized_pnl_usd = Decimal(str(current_value)) - position.size_usd
        await self.db.commit()

    async def close_position(self, position: Position, *, reason: str = "manual") -> Position:
        """Close an open position."""
        if position.status != PositionStatus.OPEN:
            raise ValueError(f"cannot close position in status {position.status}")

        # Refresh market price
        result = await self.db.execute(
            select(Market).where(Market.id == position.market_id)
        )
        market = result.scalar_one()

        exit_price = (
            market.yes_price
            if position.direction == PositionDirection.YES
            else (1.0 - (market.yes_price or 0.5))
        )

        position.exit_price = exit_price
        position.closed_at = datetime.now(timezone.utc)
        position.status = PositionStatus.CLOSED
        if position.shares:
            final_value = float(position.shares) * exit_price
            position.realized_pnl_usd = Decimal(str(final_value)) - position.size_usd
        position.meta = {**(position.meta or {}), "close_reason": reason}
        await self.db.commit()

        logger.info(
            "position.closed",
            position_id=str(position.id),
            exit_price=exit_price,
            pnl=str(position.realized_pnl_usd),
        )
        return position
