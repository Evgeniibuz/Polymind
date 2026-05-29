"""Smoke tests — verify the app boots and core logic works without external services."""

from datetime import datetime, timezone

from app.ai.scoring import compute_velocity, quick_sentiment


def test_sentiment_positive():
    assert quick_sentiment("massive rally and breakout, bullish surge") > 0


def test_sentiment_negative():
    assert quick_sentiment("market crash, panic, recession fears") < 0


def test_sentiment_neutral():
    assert quick_sentiment("the meeting is scheduled for tuesday") == 0.0


def test_velocity_scales_with_engagement():
    now = datetime.now(timezone.utc)
    low = compute_velocity(
        engagement={"likes": 10, "retweets": 2}, published_at=now, source="twitter"
    )
    high = compute_velocity(
        engagement={"likes": 10000, "retweets": 5000}, published_at=now, source="twitter"
    )
    assert high > low
    assert 0 <= low <= 10
    assert 0 <= high <= 10


def test_probability_keyword_extraction():
    from app.services.signal_service import _extract_keywords

    kws = _extract_keywords("Will Bitcoin close above $120K on Dec 31?")
    assert "Bitcoin" in kws
