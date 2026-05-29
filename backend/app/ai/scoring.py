"""Lightweight signal scoring — sentiment + velocity.

Velocity = how fast a topic is gaining attention.
Sentiment = directional mood (-1 negative to +1 positive).

We use the LLM for high-stakes decisions, but cheaper heuristics
for the firehose of incoming events.
"""

import math
import re
from datetime import datetime, timezone


POSITIVE_WORDS = {
    "rally", "surge", "soar", "bullish", "breakout", "pump", "moon",
    "milestone", "approval", "win", "victory", "breakthrough", "boom",
    "rise", "gain", "growth", "positive", "optimistic", "confident",
    "pivot", "dovish", "cut", "accommodate",
}

NEGATIVE_WORDS = {
    "crash", "plunge", "tank", "bearish", "dump", "rug", "scam",
    "recession", "rejected", "loss", "fail", "lawsuit", "fraud",
    "fall", "drop", "decline", "negative", "fear", "panic", "concerns",
    "hawkish", "hike", "tighten", "warning",
}

_word_re = re.compile(r"\b[a-zA-Z]+\b")


def quick_sentiment(text: str) -> float:
    """Naive lexicon sentiment. Returns -1..+1.

    For production replace with FinBERT or a Claude batch classifier.
    """
    if not text:
        return 0.0
    tokens = {w.lower() for w in _word_re.findall(text)}
    pos = len(tokens & POSITIVE_WORDS)
    neg = len(tokens & NEGATIVE_WORDS)
    total = pos + neg
    if total == 0:
        return 0.0
    return (pos - neg) / total


def compute_velocity(
    *,
    engagement: dict | None,
    published_at: datetime,
    source: str,
) -> float:
    """Compute a 0-10 velocity score weighted by engagement and recency.

    Engagement is source-specific:
      twitter: likes, retweets, replies, impressions
      reddit: upvotes, comments
      news: (no engagement — uses recency only)
    """
    eng = engagement or {}

    # Source-specific raw score
    if source == "twitter":
        raw = (
            (eng.get("likes", 0) * 1.0)
            + (eng.get("retweets", 0) * 3.0)
            + (eng.get("replies", 0) * 1.5)
            + (eng.get("impressions", 0) * 0.001)
        )
    elif source == "reddit":
        raw = (eng.get("upvotes", 0) * 1.0) + (eng.get("comments", 0) * 2.0)
    else:
        raw = 100  # baseline for news/telegram

    # Logarithmic compression: 1 -> 0, 100 -> 4.6, 10K -> 9.2
    score = math.log10(max(raw, 1)) * 2.0

    # Recency multiplier — events older than 24h get penalty
    age_hours = max(
        0.0, (datetime.now(timezone.utc) - published_at).total_seconds() / 3600
    )
    recency = math.exp(-age_hours / 24)

    return min(10.0, score * (0.5 + 0.5 * recency))
