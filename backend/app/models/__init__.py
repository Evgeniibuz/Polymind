"""All models — import here so Alembic discovers them."""

from app.models.bot import Bot, BotStatus, BotStrategy
from app.models.event import EventSource, IngestedEvent
from app.models.market import (
    Market,
    MarketCategory,
    MarketSnapshot,
    MarketSource,
    MarketStatus,
)
from app.models.position import Position, PositionDirection, PositionStatus
from app.models.signal import Signal, SignalDirection, SignalStatus
from app.models.user import AuthProvider, User
from app.models.whale import WhalePosition, WhaleTag, WhaleWallet

__all__ = [
    "AuthProvider",
    "Bot",
    "BotStatus",
    "BotStrategy",
    "EventSource",
    "IngestedEvent",
    "Market",
    "MarketCategory",
    "MarketSnapshot",
    "MarketSource",
    "MarketStatus",
    "Position",
    "PositionDirection",
    "PositionStatus",
    "Signal",
    "SignalDirection",
    "SignalStatus",
    "User",
    "WhalePosition",
    "WhaleTag",
    "WhaleWallet",
]
