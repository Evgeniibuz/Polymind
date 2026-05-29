"""Shared async Redis client."""

import redis.asyncio as aioredis

from app.core.config import settings

redis_client: aioredis.Redis = aioredis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=False,  # we handle decoding explicitly per-call
    health_check_interval=30,
)


async def ping_redis() -> bool:
    try:
        return await redis_client.ping()
    except Exception:
        return False
