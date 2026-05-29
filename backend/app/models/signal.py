"""AI-generated mispricing signal — the core output of Polymind."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class SignalDirection(StrEnum):
    YES = "yes"
    NO = "no"


class SignalStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    EXECUTED = "executed"
    INVALIDATED = "invalidated"


class Signal(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "signals"
    __table_args__ = (
        Index("ix_signals_status_confidence", "status", "confidence"),
        Index("ix_signals_market_active", "market_id", "status"),
    )

    market_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("markets.id", ondelete="CASCADE"),
        nullable=False,
    )

    direction: Mapped[SignalDirection] = mapped_column(String(8), nullable=False)
    status: Mapped[SignalStatus] = mapped_column(
        String(16), default=SignalStatus.ACTIVE, index=True
    )

    # Market YES probability at signal creation (0.0–1.0)
    market_probability: Mapped[float] = mapped_column(Float, nullable=False)
    # AI estimated true probability
    ai_probability: Mapped[float] = mapped_column(Float, nullable=False)
    # Edge in percentage points (e.g. +23)
    edge_pp: Mapped[float] = mapped_column(Float, nullable=False)

    # Confidence 0–100
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Plain-English AI reasoning shown to users
    reasoning: Mapped[str] = mapped_column(String, nullable=False)

    # Evidence breakdown — per-component scores
    # {"social": 78, "onchain": 92, "news": 71, "whales": 84, "historical": 58}
    evidence: Mapped[dict] = mapped_column(JSON, nullable=False)

    # IDs of ingested events that fed into this signal (for traceability)
    source_event_ids: Mapped[list[str] | None] = mapped_column(ARRAY(PG_UUID(as_uuid=True)))

    # Lifecycle
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invalidated_reason: Mapped[str | None] = mapped_column(String(256))

    # Outcome tracking (filled after resolution)
    was_correct: Mapped[bool | None] = mapped_column()
    realized_pnl_pp: Mapped[float | None] = mapped_column(Float)

    market: Mapped["Market"] = relationship(back_populates="signals")  # noqa: F821
