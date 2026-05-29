"""News aggregator — combines NewsAPI (paid) and RSS feeds (free)."""

import asyncio
from datetime import datetime, timezone

import feedparser
import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# Curated list of high-signal RSS feeds — extend as needed.
DEFAULT_RSS_FEEDS = [
    ("Reuters Markets", "https://feeds.reuters.com/reuters/businessNews"),
    ("Bloomberg Markets", "https://feeds.bloomberg.com/markets/news.rss"),
    ("WSJ Markets", "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"),
    ("CNBC Top", "https://www.cnbc.com/id/100003114/device/rss/rss.html"),
    ("FT World", "https://www.ft.com/?format=rss"),
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("The Block", "https://www.theblock.co/rss.xml"),
    ("Politico", "https://www.politico.com/rss/politicopicks.xml"),
]


class NewsClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(
            timeout=15.0,
            headers={"User-Agent": "Polymind/0.1 NewsBot"},
        )

    async def close(self) -> None:
        await self._http.aclose()

    async def fetch_newsapi(self, *, query: str, hours_back: int = 1) -> list[dict]:
        """Use NewsAPI.org search endpoint if key configured."""
        if not settings.newsapi_key:
            return []
        from datetime import timedelta

        from_ts = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()
        try:
            resp = await self._http.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "from": from_ts,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 50,
                },
                headers={"X-Api-Key": settings.newsapi_key},
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("newsapi.error", error=str(e))
            return []

        results = []
        for art in data.get("articles", []):
            try:
                published = datetime.fromisoformat(
                    art["publishedAt"].replace("Z", "+00:00")
                )
            except Exception:
                published = datetime.now(timezone.utc)
            results.append({
                "external_id": art.get("url", "")[:256],
                "url": art.get("url"),
                "title": art.get("title"),
                "body": art.get("description") or art.get("content"),
                "author": art.get("source", {}).get("name"),
                "published_at": published,
                "engagement": {},
                "raw": art,
            })
        return results

    async def fetch_rss(self, feed_url: str) -> list[dict]:
        """Fetch & parse a single RSS feed."""
        try:
            resp = await self._http.get(feed_url)
            resp.raise_for_status()
        except Exception as e:
            logger.warning("rss.fetch.error", url=feed_url, error=str(e))
            return []

        # feedparser is sync; offload to thread
        parsed = await asyncio.to_thread(feedparser.parse, resp.content)

        results = []
        for entry in parsed.entries[:50]:
            try:
                published = (
                    datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    if hasattr(entry, "published_parsed") and entry.published_parsed
                    else datetime.now(timezone.utc)
                )
            except Exception:
                published = datetime.now(timezone.utc)
            results.append({
                "external_id": entry.get("id") or entry.get("link", "")[:256],
                "url": entry.get("link"),
                "title": entry.get("title"),
                "body": entry.get("summary"),
                "author": entry.get("author"),
                "published_at": published,
                "engagement": {},
                "raw": {"feed": feed_url},
            })
        return results

    async def fetch_all_rss(self) -> list[dict]:
        """Fan-out fetch all default feeds in parallel."""
        results = await asyncio.gather(
            *[self.fetch_rss(url) for _, url in DEFAULT_RSS_FEEDS],
            return_exceptions=True,
        )
        flat = []
        for r in results:
            if isinstance(r, list):
                flat.extend(r)
        return flat


_news_singleton: NewsClient | None = None


def get_news_client() -> NewsClient:
    global _news_singleton
    if _news_singleton is None:
        _news_singleton = NewsClient()
    return _news_singleton
