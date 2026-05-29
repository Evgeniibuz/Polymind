"""Arbitrage & Kalshi sync tasks."""

from datetime import datetime, timedelta, timezone

from app.core.logging import get_logger
from app.core.redis import redis_client
from app.db.session import session_scope
from app.services.arbitrage_service import ArbitrageService
from app.services.market_sync import MarketSyncService

logger = get_logger(__name__)

ARB_PUBSUB_CHANNEL = "arbitrage:new"


async def sync_kalshi(ctx: dict) -> dict:
    async with session_scope() as db:
        return await MarketSyncService(db).sync_kalshi(limit=200)


async def detect_arbitrage(ctx: dict) -> dict:
    """Find cross-market arbitrage pairs and cache them for the API."""
    import orjson

    async with session_scope() as db:
        pairs = await ArbitrageService(db).find_pairs()

    serialized = [
        {
            "poly_market_id": str(p.poly_market.id),
            "kalshi_market_id": str(p.kalshi_market.id),
            "question": p.poly_market.question,
            "poly_yes": p.poly_market.yes_price,
            "kalshi_yes": p.kalshi_market.yes_price,
            "spread": p.spread,
            "similarity": p.similarity,
            "cheap_venue": p.cheap_venue,
            "expensive_venue": p.expensive_venue,
            "edge_pp": p.expected_edge_pp,
            "detected_at": datetime.now(timezone.utc).isoformat(),
        }
        for p in pairs[:50]
    ]

    # Cache for the REST endpoint (TTL 10 min)
    try:
        await redis_client.setex(
            "arbitrage:pairs", 600, orjson.dumps(serialized)
        )
        if serialized:
            await redis_client.publish(ARB_PUBSUB_CHANNEL, orjson.dumps(serialized))
    except Exception as e:
        logger.warning("arb.cache.error", error=str(e))

    return {"pairs": len(serialized)}
