"""Whale wallet service."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.whale import WhalePosition, WhaleWallet


class WhaleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_top(self, *, limit: int = 50) -> list[WhaleWallet]:
        result = await self.db.execute(
            select(WhaleWallet)
            .where(WhaleWallet.is_active.is_(True))
            .order_by(WhaleWallet.confidence_score.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def recent_positions(self, *, hours: int = 24, limit: int = 50) -> list[WhalePosition]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self.db.execute(
            select(WhalePosition)
            .where(WhalePosition.first_seen_at >= cutoff)
            .order_by(WhalePosition.first_seen_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def aggregate_flow_24h(self) -> dict:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(WhalePosition.size_usd), 0).label("total_volume"),
                func.count(WhalePosition.id).label("position_count"),
            ).where(WhalePosition.first_seen_at >= cutoff)
        )
        row = result.one()
        return {
            "net_flow_usd": float(row.total_volume),
            "position_count": int(row.position_count),
        }
