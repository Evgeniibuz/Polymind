"""Raw event model — ingested data from sources (tweet, news, onchain tx, etc)."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    Index,
    String,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class EventSource(StrEnum):
    TWITTER = "twitter"
    TELEGRAM = "telegram"
    REDDIT = "reddit"
    NEWS = "news"
    ONCHAIN = "onchain"
    YOUTUBE = "youtube"
    GTRENDS = "gtrends"


class IngestedEvent(Base, UUIDMixin, TimestampMixin):
    """A single raw signal from one source — tweet, news article, onchain tx, etc."""

    __tablename__ = "ingested_events"
    __table_args__ = (
        Index("ix_events_source_external", "source", "external_id", unique=True),
        Index("ix_events_published_velocity", "published_at", "velocity_score"),
    )

    source: Mapped[EventSource] = mapped_column(String(16), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(256), nullable=False)
    url: Mapped[str | None] = mapped_column(String(1024))

    # Content
    title: Mapped[str | None] = mapped_column(String(512))
    body: Mapped[str | None] = mapped_column(String)
    author: Mapped[str | None] = mapped_column(String(256))

    # Timing
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Engagement metrics (likes, retweets, upvotes...)
    engagement: Mapped[dict | None] = mapped_column(JSON)

    # AI processing
    velocity_score: Mapped[float | None] = mapped_column(Float)  # 0-10
    sentiment_score: Mapped[float | None] = mapped_column(Float)  # -1 to +1
    classified_categories: Mapped[list[str] | None] = mapped_column(ARRAY(String(32)))
    classified_entities: Mapped[list[str] | None] = mapped_column(ARRAY(String(128)))
    embedding_processed: Mapped[bool] = mapped_column(default=False, index=True)
    embedding_id: Mapped[str | None] = mapped_column(String(64))

    raw: Mapped[dict | None] = mapped_column(JSON)
