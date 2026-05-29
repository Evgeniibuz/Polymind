"""Bot service — CRUD + signal-to-bot matching."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.models.bot import Bot, BotStatus, BotStrategy
from app.models.market import MarketCategory
from app.models.signal import Signal
from app.models.user import User
from app.schemas.bot import BotCreate, BotUpdate

logger = get_logger(__name__)


class BotService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_user(self, user_id: UUID) -> list[Bot]:
        result = await self.db.execute(
            select(Bot)
            .where(Bot.user_id == user_id)
            .order_by(Bot.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_for_user(self, user_id: UUID, bot_id: UUID) -> Bot | None:
        result = await self.db.execute(
            select(Bot)
            .options(selectinload(Bot.positions))
            .where(Bot.id == bot_id, Bot.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user: User, payload: BotCreate) -> Bot:
        weights = payload.signal_weights.model_dump() if payload.signal_weights else {
            "social": 30, "onchain": 25, "news": 25, "whales": 20
        }
        bot = Bot(
            user_id=user.id,
            name=payload.name,
            strategy=BotStrategy(payload.strategy),
            status=BotStatus.PAUSED,
            capital_allocated=payload.capital_allocated,
            max_position_usd=payload.max_position_usd,
            stop_loss_pct=payload.stop_loss_pct,
            take_profit_pct=payload.take_profit_pct,
            categories=payload.categories,
            sources=payload.sources,
            min_liquidity=payload.min_liquidity,
            min_confidence=payload.min_confidence,
            min_edge_pp=payload.min_edge_pp,
            signal_weights=weights,
            custom_logic=payload.custom_logic,
            auto_execute=payload.auto_execute,
        )
        self.db.add(bot)
        await self.db.commit()
        await self.db.refresh(bot)
        return bot

    async def update(self, bot: Bot, payload: BotUpdate) -> Bot:
        data = payload.model_dump(exclude_unset=True)
        if "status" in data:
            data["status"] = BotStatus(data["status"])
        if "signal_weights" in data and data["signal_weights"] is not None:
            data["signal_weights"] = (
                data["signal_weights"].model_dump()
                if hasattr(data["signal_weights"], "model_dump")
                else data["signal_weights"]
            )
        for k, v in data.items():
            setattr(bot, k, v)
        await self.db.commit()
        await self.db.refresh(bot)
        return bot

    async def delete(self, bot: Bot) -> None:
        await self.db.delete(bot)
        await self.db.commit()

    async def find_matching_bots(self, signal: Signal) -> list[Bot]:
        """Return all active bots whose filters match this signal."""
        category = signal.market.category if signal.market else None

        stmt = select(Bot).where(
            Bot.status == BotStatus.ACTIVE,
            Bot.min_confidence <= signal.confidence,
            Bot.min_edge_pp <= abs(signal.edge_pp),
        )
        result = await self.db.execute(stmt)
        bots = list(result.scalars().all())

        # Filter by category & min_liquidity in Python (JSON column)
        matched = []
        for bot in bots:
            if bot.categories:
                if not category or category.value not in bot.categories:
                    continue
            if signal.market and float(signal.market.liquidity or 0) < float(bot.min_liquidity or 0):
                continue
            matched.append(bot)
        return matched

    async def record_run(self, bot: Bot) -> None:
        bot.last_run_at = datetime.now(timezone.utc)
        await self.db.commit()
