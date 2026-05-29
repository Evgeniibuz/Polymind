"""Market endpoints — list, detail, history."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DB
from app.models.market import Market, MarketSnapshot
from app.schemas.market import MarketDetail, MarketSnapshotPoint, MarketSummary

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("", response_model=list[MarketSummary])
async def list_markets(
    db: DB,
    category: str | None = None,
    status: str = "active",
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    sort: str = Query(default="volume_24h", pattern="^(volume_24h|liquidity|end_date)$"),
) -> list[Market]:
    stmt = select(Market).where(Market.status == status)
    if category:
        stmt = stmt.where(Market.category == category)
    sort_col = {
        "volume_24h": Market.volume_24h,
        "liquidity": Market.liquidity,
        "end_date": Market.end_date,
    }[sort]
    stmt = stmt.order_by(sort_col.desc().nulls_last()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{market_id}", response_model=MarketDetail)
async def get_market(market_id: UUID, db: DB) -> Market:
    result = await db.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()
    if market is None:
        raise HTTPException(404, "market not found")
    return market


@router.get("/{market_id}/history", response_model=list[MarketSnapshotPoint])
async def market_history(
    market_id: UUID,
    db: DB,
    hours: int = Query(default=24, le=720),
) -> list[MarketSnapshot]:
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(MarketSnapshot)
        .where(
            MarketSnapshot.market_id == market_id,
            MarketSnapshot.timestamp >= cutoff,
        )
        .order_by(MarketSnapshot.timestamp.asc())
    )
    return list(result.scalars().all())
