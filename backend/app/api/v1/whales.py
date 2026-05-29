"""Whale tracker endpoints."""

from fastapi import APIRouter, Query

from app.api.deps import DB
from app.schemas.position import WhalePositionView, WhaleSummary
from app.services.whale_service import WhaleService

router = APIRouter(prefix="/whales", tags=["whales"])


@router.get("", response_model=list[WhaleSummary])
async def list_top_whales(db: DB, limit: int = Query(default=50, le=200)):
    return await WhaleService(db).list_top(limit=limit)


@router.get("/recent", response_model=list[WhalePositionView])
async def recent_whale_positions(
    db: DB,
    hours: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=50, le=200),
):
    return await WhaleService(db).recent_positions(hours=hours, limit=limit)


@router.get("/flow")
async def aggregate_flow(db: DB) -> dict:
    return await WhaleService(db).aggregate_flow_24h()
