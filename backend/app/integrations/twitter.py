"""Twitter/X data source — searches for relevant tweets via API v2.

Uses tweepy AsyncClient. Bearer Token from developer.x.com.
With Basic tier ($200/mo) you get 15K tweets/month.

For higher volume, switch to alternative scrapers (Apify, scraping libs).
"""

import asyncio
from datetime import datetime, timezone

import tweepy

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class TwitterClient:
    def __init__(self) -> None:
        self._client: tweepy.asynchronous.AsyncClient | None = None

    def _get(self) -> tweepy.asynchronous.AsyncClient:
        if not settings.twitter_bearer_token:
            raise RuntimeError("TWITTER_BEARER_TOKEN not set")
        if self._client is None:
            self._client = tweepy.asynchronous.AsyncClient(
                bearer_token=settings.twitter_bearer_token,
                wait_on_rate_limit=True,
            )
        return self._client

    async def search_recent(
        self,
        query: str,
        *,
        max_results: int = 50,
        since_id: str | None = None,
    ) -> list[dict]:
        """Search tweets from last 7 days. Query syntax: https://developer.x.com/en/docs/x-api/tweets/search/integrate/build-a-query"""
        client = self._get()
        try:
            response = await client.search_recent_tweets(
                query=f"({query}) lang:en -is:retweet",
                max_results=min(max(max_results, 10), 100),
                since_id=since_id,
                tweet_fields=["created_at", "public_metrics", "author_id", "lang"],
                user_fields=["username", "name", "verified", "public_metrics"],
                expansions=["author_id"],
            )
        except tweepy.errors.TweepyException as e:
            logger.warning("twitter.search.error", query=query, error=str(e))
            return []

        if not response.data:
            return []

        users_by_id = {
            u["id"]: u for u in (response.includes.get("users", []) if response.includes else [])
        }

        results = []
        for tweet in response.data:
            user = users_by_id.get(tweet.author_id, {})
            metrics = tweet.public_metrics or {}
            results.append({
                "external_id": str(tweet.id),
                "url": f"https://x.com/i/web/status/{tweet.id}",
                "body": tweet.text,
                "author": user.get("username"),
                "author_verified": user.get("verified", False),
                "published_at": tweet.created_at or datetime.now(timezone.utc),
                "engagement": {
                    "likes": metrics.get("like_count", 0),
                    "retweets": metrics.get("retweet_count", 0),
                    "replies": metrics.get("reply_count", 0),
                    "quotes": metrics.get("quote_count", 0),
                    "impressions": metrics.get("impression_count", 0),
                },
                "raw": {
                    "tweet_id": str(tweet.id),
                    "author_id": str(tweet.author_id),
                },
            })
        return results


_twitter_singleton: TwitterClient | None = None


def get_twitter_client() -> TwitterClient:
    global _twitter_singleton
    if _twitter_singleton is None:
        _twitter_singleton = TwitterClient()
    return _twitter_singleton
