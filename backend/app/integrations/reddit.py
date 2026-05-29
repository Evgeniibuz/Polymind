"""Reddit data source via PRAW (asyncpraw).

Free API: 100 queries/min. Tracks key trading subreddits.
"""

import asyncio
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


TRACKED_SUBREDDITS = [
    "wallstreetbets",
    "stocks",
    "cryptocurrency",
    "Bitcoin",
    "ethereum",
    "PredictionMarkets",
    "Polymarket",
    "neutralpolitics",
    "Economics",
    "options",
]


class RedditClient:
    def __init__(self) -> None:
        self._reddit = None

    def _get(self):
        if self._reddit is None:
            if not (settings.reddit_client_id and settings.reddit_client_secret):
                raise RuntimeError("REDDIT credentials not set")
            import praw
            self._reddit = praw.Reddit(
                client_id=settings.reddit_client_id,
                client_secret=settings.reddit_client_secret,
                user_agent=settings.reddit_user_agent,
            )
            self._reddit.read_only = True
        return self._reddit

    async def fetch_hot(self, subreddit: str, *, limit: int = 25) -> list[dict]:
        """PRAW is synchronous — offload to thread."""
        def _sync():
            reddit = self._get()
            sub = reddit.subreddit(subreddit)
            posts = []
            for post in sub.hot(limit=limit):
                posts.append({
                    "external_id": post.id,
                    "url": f"https://reddit.com{post.permalink}",
                    "title": post.title,
                    "body": post.selftext[:2000] if post.selftext else None,
                    "author": str(post.author) if post.author else "[deleted]",
                    "published_at": datetime.fromtimestamp(post.created_utc, tz=timezone.utc),
                    "engagement": {
                        "upvotes": post.score,
                        "comments": post.num_comments,
                        "upvote_ratio": post.upvote_ratio,
                    },
                    "raw": {
                        "subreddit": subreddit,
                        "flair": post.link_flair_text,
                    },
                })
            return posts

        try:
            return await asyncio.to_thread(_sync)
        except Exception as e:
            logger.warning("reddit.fetch.error", subreddit=subreddit, error=str(e))
            return []

    async def fetch_all_subreddits(self, *, limit_each: int = 25) -> list[dict]:
        results = await asyncio.gather(
            *[self.fetch_hot(sub, limit=limit_each) for sub in TRACKED_SUBREDDITS],
            return_exceptions=True,
        )
        flat = []
        for r in results:
            if isinstance(r, list):
                flat.extend(r)
        return flat


_reddit_singleton: RedditClient | None = None


def get_reddit_client() -> RedditClient:
    global _reddit_singleton
    if _reddit_singleton is None:
        _reddit_singleton = RedditClient()
    return _reddit_singleton
