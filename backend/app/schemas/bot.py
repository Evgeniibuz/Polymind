"""Bot configuration & status schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class SignalWeights(BaseModel):
    social: int = Field(ge=0, le=100, default=30)
    onchain: int = Field(ge=0, le=100, default=25)
    news: int = Field(ge=0, le=100, default=25)
    whales: int = Field(ge=0, le=100, default=20)


class BotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    strategy: str
    capital_allocated: float = Field(gt=0)
    max_position_usd: float = Field(gt=0)
    stop_loss_pct: float = Field(ge=1, le=99, default=15)
    take_profit_pct: float = Field(ge=1, le=500, default=50)

    categories: list[str] | None = None
    sources: list[str] | None = None
    min_liquidity: float = 50_000

    min_confidence: float = Field(ge=0, le=100, default=70)
    min_edge_pp: float = Field(ge=0, le=100, default=12)
    signal_weights: SignalWeights | None = None

    custom_logic: dict | None = None
    auto_execute: bool = True


class BotUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    capital_allocated: float | None = None
    max_position_usd: float | None = None
    stop_loss_pct: float | None = None
    take_profit_pct: float | None = None
    categories: list[str] | None = None
    sources: list[str] | None = None
    min_liquidity: float | None = None
    min_confidence: float | None = None
    min_edge_pp: float | None = None
    signal_weights: SignalWeights | None = None
    auto_execute: bool | None = None


class BotResponse(ORMModel):
    id: UUID
    name: str
    strategy: str
    status: str
    capital_allocated: float
    max_position_usd: float
    stop_loss_pct: float
    take_profit_pct: float
    min_confidence: float
    min_edge_pp: float
    pnl_24h_pct: float
    pnl_total_usd: float
    win_rate: float
    open_positions: int
    total_trades: int
    auto_execute: bool
    last_run_at: datetime | None
    created_at: datetime
