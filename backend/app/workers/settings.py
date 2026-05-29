"""Arq worker configuration — defines the task queue & cron schedule.

Run with:  arq app.workers.settings.WorkerSettings
"""

from arq import cron
from arq.connections import RedisSettings

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.workers.arbitrage import detect_arbitrage, sync_kalshi
from app.workers.market_sync import sync_markets
from app.workers.scanner import (
    scan_news,
    scan_onchain,
    scan_reddit,
    scan_telegram,
    scan_twitter,
)
from app.workers.signals import (
    expire_signals,
    generate_signals,
    mark_positions,
    rollup_bot_stats,
)

logger = get_logger(__name__)


async def startup(ctx: dict) -> None:
    configure_logging()
    logger.info("worker.startup", env=settings.env)


async def shutdown(ctx: dict) -> None:
    logger.info("worker.shutdown")


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    on_startup = startup
    on_shutdown = shutdown

    functions = [
        sync_markets,
        sync_kalshi,
        scan_news,
        scan_twitter,
        scan_reddit,
        scan_telegram,
        scan_onchain,
        generate_signals,
        detect_arbitrage,
        expire_signals,
        mark_positions,
        rollup_bot_stats,
    ]

    cron_jobs = [
        cron(sync_markets, minute=set(range(0, 60, 2)), run_at_startup=True),
        cron(sync_kalshi, minute=set(range(1, 60, 5))),
        cron(scan_news, minute=set(range(0, 60, 2))),
        cron(scan_twitter, minute=set(range(0, 60, 5))),
        cron(scan_reddit, minute=set(range(1, 60, 5))),
        cron(scan_telegram, minute=set(range(2, 60, 5))),
        cron(scan_onchain, minute=set(range(0, 60, 3))),
        cron(generate_signals, minute=set(range(0, 60, 3))),
        cron(detect_arbitrage, minute=set(range(0, 60, 5))),
        cron(mark_positions, minute=set(range(0, 60, 1))),
        cron(expire_signals, minute=set(range(0, 60, 5))),
        cron(rollup_bot_stats, minute=set(range(3, 60, 5))),
    ]

    max_jobs = 10
    job_timeout = 300
    keep_result = 3600
