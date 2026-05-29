"""Market & signal API schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


# ----- Market -----
class MarketSummary(ORMModel):
    id: UUID
    source: str
    external_id: str
    slug: str | None
    question: str
    category: str
    status: str
    yes_price: float | None
    no_price: float | None
    volume_24h: float
    liquidity: float
    end_date: datetime | None


class MarketDetail(MarketSummary):
    description: str | None
    volume_total: float
    last_synced_at: datetime | None


class MarketSnapshotPoint(ORMModel):
    timestamp: datetime
    yes_price: float
    volume: float


# ----- Signal -----
class SignalEvidence(BaseModel):
    social: float = Field(ge=0, le=100)
    onchain: float = Field(ge=0, le=100)
    news: float = Field(ge=0, le=100)
    whales: float = Field(ge=0, le=100)
    historical: float = Field(ge=0, le=100)


class SignalSummary(ORMModel):
    id: UUID
    market_id: UUID
    direction: str
    status: str
    market_probability: float
    ai_probability: float
    edge_pp: float
    confidence: float
    reasoning: str
    created_at: datetime
    expires_at: datetime | None


class SignalWithMarket(SignalSummary):
    market: MarketSummary
    evidence: dict


class SignalListFilter(BaseModel):
    status: str | None = "active"
    min_confidence: float = 0
    min_edge_pp: float = 0
    category: str | None = None
    limit: int = Field(default=20, le=100)
    offset: int = 0
