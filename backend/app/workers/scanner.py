"""Scanner tasks — fetch raw events from all data sources.

These run on a schedule via Arq cron. Each writes into ingested_events.
"""

from app.core.logging import get_logger
from app.db.session import session_scope
from app.models.event import EventSource
from app.services.event_ingest import EventIngestionService

logger = get_logger(__name__)


# Keyword queries to feed Twitter search — tuned to tracked market categories.
TWITTER_QUERIES = [
    "bitcoin OR BTC price",
    "federal reserve OR fed rate OR FOMC",
    "ethereum ETF OR ETH",
    "OpenAI OR GPT OR AI model",
    "recession OR inflation OR CPI",
    "election OR poll OR candidate",
    "Tesla OR TSLA deliveries",
]


async def scan_twitter(ctx: dict) -> dict:
    from app.integrations.twitter import get_twitter_client

    client = get_twitter_client()
    all_events: list[dict] = []
    for query in TWITTER_QUERIES:
        try:
            events = await client.search_recent(query, max_results=25)
            all_events.extend(events)
        except Exception as e:
            logger.warning("scan.twitter.query_error", query=query, error=str(e))

    async with session_scope() as db:
        return await EventIngestionService(db).ingest_batch(
            EventSource.TWITTER, all_events
        )


async def scan_news(ctx: dict) -> dict:
    from app.integrations.news import get_news_client

    client = get_news_client()
    events = await client.fetch_all_rss()
    # NewsAPI top-up
    for q in ["prediction market", "crypto", "federal reserve"]:
        events.extend(await client.fetch_newsapi(query=q, hours_back=1))

    async with session_scope() as db:
        return await EventIngestionService(db).ingest_batch(EventSource.NEWS, events)


async def scan_reddit(ctx: dict) -> dict:
    from app.integrations.reddit import get_reddit_client

    client = get_reddit_client()
    try:
        events = await client.fetch_all_subreddits(limit_each=20)
    except Exception as e:
        logger.warning("scan.reddit.error", error=str(e))
        return {"inserted": 0, "total": 0}

    async with session_scope() as db:
        return await EventIngestionService(db).ingest_batch(EventSource.REDDIT, events)


async def scan_telegram(ctx: dict) -> dict:
    from app.integrations.telegram import get_telegram_client

    client = get_telegram_client()
    try:
        events = await client.fetch_all_channels(limit_each=30)
    except Exception as e:
        logger.warning("scan.telegram.error", error=str(e))
        return {"inserted": 0, "total": 0}

    async with session_scope() as db:
        return await EventIngestionService(db).ingest_batch(EventSource.TELEGRAM, events)


async def scan_onchain(ctx: dict) -> dict:
    from app.integrations.onchain import get_onchain_client

    client = get_onchain_client()
    try:
        trades = await client.get_recent_large_trades()
    except Exception as e:
        logger.warning("scan.onchain.error", error=str(e))
        return {"inserted": 0}
    # Onchain trades feed the whale tracker, not ingested_events directly.
    # (whale upsert logic lives in whale_service; stubbed for MVP)
    return {"trades_seen": len(trades)}
