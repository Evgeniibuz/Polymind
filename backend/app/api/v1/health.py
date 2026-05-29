"""Health & readiness checks."""

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DB
from app.core.redis import ping_redis

router = APIRouter(tags=["meta"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/ready")
async def ready(db: DB) -> dict:
    db_ok = False
    try:
        result = await db.execute(text("SELECT 1"))
        db_ok = result.scalar() == 1
    except Exception:
        db_ok = False

    redis_ok = await ping_redis()

    status = "ok" if (db_ok and redis_ok) else "degraded"
    return {
        "status": status,
        "checks": {"database": db_ok, "redis": redis_ok},
    }
