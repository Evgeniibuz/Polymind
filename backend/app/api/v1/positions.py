"""Position endpoints — open, list, close."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DB, CurrentUser
from app.models.market import Market
from app.models.position import Position, PositionDirection, PositionStatus
from app.schemas.position import (
    PositionOpen,
    PositionResponse,
    PositionWithMarket,
)
from app.services.trading_service import TradingService

router = APIRouter(prefix="/positions", tags=["positions"])


@router.get("", response_model=list[PositionWithMarket])
async def list_positions(
    user: CurrentUser,
    db: DB,
    status_filter: str = Query(default="open", alias="status"),
    limit: int = Query(default=50, le=200),
) -> list[Position]:
    result = await db.execute(
        select(Position)
        .options(selectinload(Position.market))
        .where(Position.user_id == user.id, Position.status == status_filter)
        .order_by(Position.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


@router.post("", response_model=PositionResponse, status_code=status.HTTP_201_CREATED)
async def open_position(payload: PositionOpen, user: CurrentUser, db: DB):
    result = await db.execute(select(Market).where(Market.id == payload.market_id))
    market = result.scalar_one_or_none()
    if market is None:
        raise HTTPException(404, "market not found")

    service = TradingService(db)
    try:
        position = await service.open_position(
            user_id=user.id,
            market=market,
            direction=PositionDirection(payload.direction),
            size_usd=payload.size_usd,
            stop_loss_pct=payload.stop_loss_pct,
            take_profit_pct=payload.take_profit_pct,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    return position


@router.post("/{position_id}/close", response_model=PositionResponse)
async def close_position(position_id: UUID, user: CurrentUser, db: DB):
    result = await db.execute(
        select(Position).where(
            Position.id == position_id, Position.user_id == user.id
        )
    )
    position = result.scalar_one_or_none()
    if position is None:
        raise HTTPException(404, "position not found")
    try:
        return await TradingService(db).close_position(position, reason="manual")
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
