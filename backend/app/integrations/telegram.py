"""Telegram data source via Telethon.

Monitors a curated list of trading/news channels. Requires a one-time
interactive login to produce a session string (see scripts/telegram_login.py).

Free, but you need a Telegram account + API credentials from my.telegram.org.
"""

from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# High-signal public channels (usernames without @)
TRACKED_CHANNELS = [
    "WatcherGuru",
    "tier10k",
    "DegenNews",
    "CryptoWhale",
    "financialjuice",
]


class TelegramClient:
    def __init__(self) -> None:
        self._client = None

    async def _get(self):
        if self._client is not None:
            return self._client
        if not (settings.telegram_api_id and settings.telegram_api_hash and settings.telegram_session):
            raise RuntimeError("TELEGRAM credentials/session not configured")

        from telethon import TelegramClient as Telethon
        from telethon.sessions import StringSession

        self._client = Telethon(
            StringSession(settings.telegram_session),
            settings.telegram_api_id,
            settings.telegram_api_hash,
        )
        await self._client.connect()
        if not await self._client.is_user_authorized():
            raise RuntimeError("Telegram session invalid — re-run telegram_login.py")
        return self._client

    async def fetch_channel(self, channel: str, *, limit: int = 30, since_minutes: int = 30) -> list[dict]:
        try:
            client = await self._get()
        except Exception as e:
            logger.warning("telegram.connect.error", error=str(e))
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)
        results = []
        try:
            async for msg in client.iter_messages(channel, limit=limit):
                if msg.date and msg.date < cutoff:
                    break
                if not msg.text:
                    continue
                results.append({
                    "external_id": f"{channel}:{msg.id}",
                    "url": f"https://t.me/{channel}/{msg.id}",
                    "title": None,
                    "body": msg.text[:2000],
                    "author": channel,
                    "published_at": msg.date or datetime.now(timezone.utc),
                    "engagement": {
                        "views": msg.views or 0,
                        "forwards": msg.forwards or 0,
                    },
                    "raw": {"channel": channel, "message_id": msg.id},
                })
        except Exception as e:
            logger.warning("telegram.fetch.error", channel=channel, error=str(e))
        return results

    async def fetch_all_channels(self, *, limit_each: int = 30) -> list[dict]:
        all_events = []
        for ch in TRACKED_CHANNELS:
            all_events.extend(await self.fetch_channel(ch, limit=limit_each))
        return all_events


_tg_singleton: TelegramClient | None = None


def get_telegram_client() -> TelegramClient:
    global _tg_singleton
    if _tg_singleton is None:
        _tg_singleton = TelegramClient()
    return _tg_singleton
