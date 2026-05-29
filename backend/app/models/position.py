"""Trading position model — represents a single open/closed bet."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class PositionStatus(StrEnum):
    PENDING = "pending"
    OPEN = "open"
    CLOSED = "closed"
    FAILED = "failed"


class PositionDirection(StrEnum):
    YES = "yes"
    NO = "no"


class Position(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "positions"
    __table_args__ = (
        Index("ix_positions_user_status", "user_id", "status"),
        Index("ix_positions_bot_status", "bot_id", "status"),
    )

    user_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    bot_id: Mapped[str | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bots.id", ondelete="SET NULL"),
    )
    market_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("markets.id", ondelete="CASCADE"),
        nullable=False,
    )
    signal_id: Mapped[str | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("signals.id", ondelete="SET NULL"),
    )

    direction: Mapped[PositionDirection] = mapped_column(String(8), nullable=False)
    status: Mapped[PositionStatus] = mapped_column(
        String(16), default=PositionStatus.PENDING
    )

    # Sizing
    size_usd: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    shares: Mapped[float] = mapped_column(Numeric(20, 6), default=0)

    # Pricing
    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    current_price: Mapped[float | None] = mapped_column(Float)
    exit_price: Mapped[float | None] = mapped_column(Float)

    # PnL
    unrealized_pnl_usd: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    realized_pnl_usd: Mapped[float | None] = mapped_column(Numeric(20, 2))

    # Risk targets
    stop_loss_price: Mapped[float | None] = mapped_column(Float)
    take_profit_price: Mapped[float | None] = mapped_column(Float)

    # Execution
    tx_hash_open: Mapped[str | None] = mapped_column(String(128))
    tx_hash_close: Mapped[str | None] = mapped_column(String(128))
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    error_message: Mapped[str | None] = mapped_column(String(512))
    meta: Mapped[dict | None] = mapped_column(JSON)

    bot: Mapped["Bot | None"] = relationship(back_populates="positions")  # noqa: F821
    market: Mapped["Market"] = relationship()  # noqa: F821
