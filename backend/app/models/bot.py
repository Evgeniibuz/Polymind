"""Trading bot model — user-deployed automated trader."""

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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class BotStrategy(StrEnum):
    NEWS_SNIPING = "news_sniping"
    WHALE_TRACKING = "whale_tracking"
    SENTIMENT_ARB = "sentiment_arb"
    NARRATIVE_MOMENTUM = "narrative_momentum"
    STAT_ARB = "stat_arb"
    MEAN_REVERSION = "mean_reversion"
    GRID_TRADING = "grid_trading"
    MOMENTUM_BREAKOUT = "momentum_breakout"
    CROSS_MARKET = "cross_market"
    CUSTOM = "custom"


class BotStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"


class Bot(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "bots"
    __table_args__ = (Index("ix_bots_user_status", "user_id", "status"),)

    user_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    strategy: Mapped[BotStrategy] = mapped_column(String(32), nullable=False)
    status: Mapped[BotStatus] = mapped_column(String(16), default=BotStatus.PAUSED)

    # Capital & risk
    capital_allocated: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    max_position_usd: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    stop_loss_pct: Mapped[float] = mapped_column(Float, default=15.0)
    take_profit_pct: Mapped[float] = mapped_column(Float, default=50.0)

    # Filters
    categories: Mapped[list | None] = mapped_column(JSON)  # ["Crypto", "Macro"]
    sources: Mapped[list | None] = mapped_column(JSON)  # ["twitter", "news", "onchain"]
    min_liquidity: Mapped[float] = mapped_column(Numeric(20, 2), default=50000)

    # AI triggers
    min_confidence: Mapped[float] = mapped_column(Float, default=70.0)
    min_edge_pp: Mapped[float] = mapped_column(Float, default=12.0)
    signal_weights: Mapped[dict] = mapped_column(
        JSON,
        default={"social": 30, "onchain": 25, "news": 25, "whales": 20},
    )

    # Custom logic for strategy=CUSTOM
    custom_logic: Mapped[dict | None] = mapped_column(JSON)

    # Performance
    pnl_24h_pct: Mapped[float] = mapped_column(Float, default=0)
    pnl_total_usd: Mapped[float] = mapped_column(Numeric(20, 2), default=0)
    win_rate: Mapped[float] = mapped_column(Float, default=0)
    open_positions: Mapped[int] = mapped_column(Integer, default=0)
    total_trades: Mapped[int] = mapped_column(Integer, default=0)

    auto_execute: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    positions: Mapped[list["Position"]] = relationship(  # noqa: F821
        back_populates="bot", cascade="all, delete-orphan"
    )
