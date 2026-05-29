"""Prediction market model — represents a single Yes/No market."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class MarketSource(StrEnum):
    POLYMARKET = "polymarket"
    KALSHI = "kalshi"


class MarketStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"
    RESOLVED = "resolved"


class MarketCategory(StrEnum):
    CRYPTO = "crypto"
    MACRO = "macro"
    POLITICS = "politics"
    TECH = "tech"
    SPORTS = "sports"
    STOCKS = "stocks"
    OTHER = "other"


class Market(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "markets"
    __table_args__ = (
        Index("ix_markets_source_external", "source", "external_id", unique=True),
        Index("ix_markets_active_volume", "status", "volume_24h"),
    )

    source: Mapped[MarketSource] = mapped_column(String(16), nullable=False)
    external_id: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(256))

    question: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    category: Mapped[MarketCategory] = mapped_column(String(16), default=MarketCategory.OTHER)
    status: Mapped[MarketStatus] = mapped_column(String(16), default=MarketStatus.ACTIVE)

    # Current odds for YES outcome (0.0–1.0)
    yes_price: Mapped[float | None] = mapped_column(Float)
    no_price: Mapped[float | None] = mapped_column(Float)

    # Liquidity & volume in USD
    volume_24h: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    volume_total: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    liquidity: Mapped[float] = mapped_column(Numeric(20, 2), default=0)

    # Resolution
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    resolved_outcome: Mapped[bool | None] = mapped_column(Boolean)

    # Raw payload for debugging / re-parsing
    raw: Mapped[dict | None] = mapped_column(JSON)

    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    signals: Mapped[list["Signal"]] = relationship(  # noqa: F821
        back_populates="market", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Market {self.source}:{self.external_id} {self.question[:40]!r}>"


class MarketSnapshot(Base, UUIDMixin):
    """Time-series price/volume snapshots for charts and probability models."""

    __tablename__ = "market_snapshots"
    __table_args__ = (Index("ix_snapshots_market_time", "market_id", "timestamp"),)

    market_id: Mapped[str] = mapped_column(
        ForeignKey("markets.id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    yes_price: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
