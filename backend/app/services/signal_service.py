"""Signal service — orchestrates AI probability estimates into Signal rows."""

import re
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.probability_engine import estimate_probability
from app.core.logging import get_logger
from app.core.redis import redis_client
from app.models.market import Market, MarketStatus
from app.models.signal import Signal, SignalDirection, SignalStatus
from app.services.event_ingest import EventIngestionService

logger = get_logger(__name__)


SIGNAL_TTL_HOURS = 6
SIGNAL_PUBSUB_CHANNEL = "signals:new"


def _extract_keywords(question: str) -> list[str]:
    """Crude keyword extractor — pulls capitalized words and meaningful nouns."""
    tokens = re.findall(r"\b[A-Za-z][A-Za-z0-9]{2,}\b", question)
    stopwords = {"the", "will", "that", "this", "with", "for", "and", "are", "any"}
    return [t for t in tokens if t.lower() not in stopwords][:8]


class SignalService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.event_service = EventIngestionService(db)

    async def generate_for_market(self, market: Market) -> Signal | None:
        """Generate a fresh signal for a single market via the LLM engine."""
        if market.status != MarketStatus.ACTIVE or market.yes_price is None:
            return None

        keywords = _extract_keywords(market.question)
        events = await self.event_service.recent_for_market(
            keywords, limit=30, max_age_hours=48
        )

        signal_events = [
            {
                "source": e.source.value if hasattr(e.source, "value") else e.source,
                "title": e.title,
                "body": e.body,
                "published_at": e.published_at.isoformat(),
                "engagement": e.engagement,
            }
            for e in events
        ]

        estimate = await estimate_probability(
            market_question=market.question,
            market_yes_price=market.yes_price,
            market_volume=float(market.volume_24h or 0),
            market_category=market.category.value if hasattr(market.category, "value") else market.category,
            end_date=market.end_date.isoformat() if market.end_date else None,
            recent_signals=signal_events,
        )
        if estimate is None:
            return None

        # Skip low-quality estimates
        if estimate.confidence < 40 or abs(estimate.edge_pp) < 3:
            logger.debug(
                "signal.skip.lowq",
                market=market.question[:60],
                conf=estimate.confidence,
                edge=estimate.edge_pp,
            )
            return None

        signal = Signal(
            market_id=market.id,
            direction=SignalDirection(estimate.direction),
            status=SignalStatus.ACTIVE,
            market_probability=estimate.market_probability,
            ai_probability=estimate.ai_probability,
            edge_pp=estimate.edge_pp,
            confidence=estimate.confidence,
            reasoning=estimate.reasoning,
            evidence={**estimate.evidence, "key_drivers": estimate.key_drivers},
            source_event_ids=[str(e.id) for e in events][:50],
            expires_at=datetime.now(timezone.utc) + timedelta(hours=SIGNAL_TTL_HOURS),
        )
        self.db.add(signal)
        await self.db.commit()
        await self.db.refresh(signal, attribute_names=["id"])
        # Attach market relationship for downstream consumers (bot dispatch, pubsub)
        signal.market = market

        # Broadcast to WebSocket subscribers via Redis Pub/Sub
        await self._publish(signal)

        logger.info(
            "signal.created",
            signal_id=str(signal.id),
            market=market.question[:60],
            edge=estimate.edge_pp,
            confidence=estimate.confidence,
        )
        return signal

    async def expire_stale(self) -> int:
        """Mark signals past expires_at as expired."""
        from sqlalchemy import update

        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(Signal)
            .where(
                and_(
                    Signal.status == SignalStatus.ACTIVE,
                    Signal.expires_at < now,
                )
            )
            .values(status=SignalStatus.EXPIRED)
        )
        await self.db.commit()
        return result.rowcount or 0

    async def list_active(
        self,
        *,
        min_confidence: float = 0,
        min_edge_pp: float = 0,
        category: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Signal]:
        stmt = (
            select(Signal)
            .options(selectinload(Signal.market))
            .where(
                Signal.status == SignalStatus.ACTIVE,
                Signal.confidence >= min_confidence,
                func.abs(Signal.edge_pp) >= min_edge_pp,
            )
            .order_by(Signal.confidence.desc(), Signal.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if category:
            stmt = stmt.join(Signal.market).where(Market.category == category)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, signal_id: UUID) -> Signal | None:
        result = await self.db.execute(
            select(Signal)
            .options(selectinload(Signal.market))
            .where(Signal.id == signal_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def _publish(signal: Signal) -> None:
        """Broadcast a new signal to WebSocket subscribers via Redis pub/sub."""
        import orjson

        payload = orjson.dumps({
            "id": str(signal.id),
            "market_id": str(signal.market_id),
            "direction": signal.direction.value if hasattr(signal.direction, "value") else signal.direction,
            "market_probability": signal.market_probability,
            "ai_probability": signal.ai_probability,
            "edge_pp": signal.edge_pp,
            "confidence": signal.confidence,
            "reasoning": signal.reasoning,
            "created_at": signal.created_at.isoformat(),
        })
        try:
            await redis_client.publish(SIGNAL_PUBSUB_CHANNEL, payload)
        except Exception as e:
            logger.warning("signal.publish.error", error=str(e))
