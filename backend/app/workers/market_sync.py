"""Market sync task — keeps markets table fresh from Polymarket."""

from app.core.logging import get_logger
from app.db.session import session_scope
from app.services.market_sync import MarketSyncService

logger = get_logger(__name__)


async def sync_markets(ctx: dict) -> dict:
    async with session_scope() as db:
        return await MarketSyncService(db).sync_polymarket(limit=200)
