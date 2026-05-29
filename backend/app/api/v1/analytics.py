"""Arbitrage pairs + dashboard aggregate stats endpoints."""

import orjson
from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import DB, CurrentUser
from app.core.redis import redis_client
from app.models.market import Market, MarketStatus
from app.models.position import Position, PositionStatus
from app.models.signal import Signal, SignalStatus

router = APIRouter(tags=["analytics"])


@router.get("/arbitrage")
async def list_arbitrage() -> dict:
    """Return cached cross-market arbitrage pairs (refreshed every 5 min by worker)."""
    try:
        cached = await redis_client.get("arbitrage:pairs")
        if cached:
            return {"pairs": orjson.loads(cached)}
    except Exception:
        pass
    return {"pairs": []}


@router.get("/dashboard/stats")
async def dashboard_stats(db: DB) -> dict:
    """Aggregate KPIs for the terminal dashboard header."""
    # Active signals count
    active_signals = await db.scalar(
        select(func.count(Signal.id)).where(Signal.status == SignalStatus.ACTIVE)
    )
    # Average edge across active signals
    avg_edge = await db.scalar(
        select(func.avg(func.abs(Signal.edge_pp))).where(
            Signal.status == SignalStatus.ACTIVE
        )
    )
    # Markets being scanned
    market_count = await db.scalar(
        select(func.count(Market.id)).where(Market.status == MarketStatus.ACTIVE)
    )
    # Total volume analyzed
    total_volume = await db.scalar(
        select(func.coalesce(func.sum(Market.volume_24h), 0)).where(
            Market.status == MarketStatus.ACTIVE
        )
    )

    return {
        "active_signals": int(active_signals or 0),
        "avg_edge_pp": round(float(avg_edge or 0), 1),
        "markets_scanned": int(market_count or 0),
        "total_volume_24h": float(total_volume or 0),
    }


@router.get("/dashboard/portfolio")
async def portfolio_stats(user: CurrentUser, db: DB) -> dict:
    """Per-user portfolio KPIs."""
    capital_deployed = await db.scalar(
        select(func.coalesce(func.sum(Position.size_usd), 0)).where(
            Position.user_id == user.id, Position.status == PositionStatus.OPEN
        )
    )
    unrealized = await db.scalar(
        select(func.coalesce(func.sum(Position.unrealized_pnl_usd), 0)).where(
            Position.user_id == user.id, Position.status == PositionStatus.OPEN
        )
    )
    realized = await db.scalar(
        select(func.coalesce(func.sum(Position.realized_pnl_usd), 0)).where(
            Position.user_id == user.id, Position.status == PositionStatus.CLOSED
        )
    )
    open_count = await db.scalar(
        select(func.count(Position.id)).where(
            Position.user_id == user.id, Position.status == PositionStatus.OPEN
        )
    )

    return {
        "capital_deployed": float(capital_deployed or 0),
        "unrealized_pnl": float(unrealized or 0),
        "realized_pnl": float(realized or 0),
        "open_positions": int(open_count or 0),
    }
