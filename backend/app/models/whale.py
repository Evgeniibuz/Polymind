"""Tracked whale wallet model."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class WhaleTag(StrEnum):
    WHALE = "whale"
    SMART_MONEY = "smart_money"
    POLYMARKET_OG = "polymarket_og"
    CUSTOM = "custom"


class WhaleWallet(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "whale_wallets"

    address: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    label: Mapped[str | None] = mapped_column(String(128))
    tag: Mapped[WhaleTag] = mapped_column(String(32), default=WhaleTag.WHALE)

    # Performance metrics — recalculated periodically
    total_volume_usd: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    realized_pnl_usd: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    win_rate: Mapped[float] = mapped_column(Float, default=0)
    total_positions: Mapped[int] = mapped_column(Integer, default=0)
    confidence_score: Mapped[float] = mapped_column(Float, default=50)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    meta: Mapped[dict | None] = mapped_column(JSON)


class WhalePosition(Base, UUIDMixin):
    """Snapshot of a whale's position in a market."""

    __tablename__ = "whale_positions"
    __table_args__ = (
        Index("ix_whale_positions_whale_market", "whale_id", "market_id"),
        Index("ix_whale_positions_first_seen", "first_seen_at"),
    )

    whale_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("whale_wallets.id", ondelete="CASCADE"),
        nullable=False,
    )
    market_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("markets.id", ondelete="CASCADE"),
        nullable=False,
    )

    direction: Mapped[str] = mapped_column(String(8), nullable=False)  # yes / no
    size_usd: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    current_price: Mapped[float | None] = mapped_column(Float)
    pnl_pct: Mapped[float | None] = mapped_column(Float)

    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
