"""Position & whale tracking schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.market import MarketSummary


class PositionOpen(BaseModel):
    market_id: UUID
    signal_id: UUID | None = None
    direction: str = Field(pattern="^(yes|no)$")
    size_usd: float = Field(gt=0)
    stop_loss_pct: float | None = Field(default=None, ge=1, le=99)
    take_profit_pct: float | None = Field(default=None, ge=1, le=500)


class PositionResponse(ORMModel):
    id: UUID
    market_id: UUID
    bot_id: UUID | None
    signal_id: UUID | None
    direction: str
    status: str
    size_usd: float
    shares: float
    entry_price: float
    current_price: float | None
    exit_price: float | None
    unrealized_pnl_usd: float
    realized_pnl_usd: float | None
    stop_loss_price: float | None
    take_profit_price: float | None
    tx_hash_open: str | None
    opened_at: datetime | None
    closed_at: datetime | None


class PositionWithMarket(PositionResponse):
    market: MarketSummary


# ----- Whale -----
class WhaleSummary(ORMModel):
    id: UUID
    address: str
    label: str | None
    tag: str
    total_volume_usd: float
    realized_pnl_usd: float
    win_rate: float
    total_positions: int
    confidence_score: float
    last_activity_at: datetime | None


class WhalePositionView(ORMModel):
    id: UUID
    whale_id: UUID
    market_id: UUID
    direction: str
    size_usd: float
    entry_price: float
    current_price: float | None
    pnl_pct: float | None
    first_seen_at: datetime
    market: MarketSummary | None = None
