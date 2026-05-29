"""Event ingestion — persists raw events from all data sources.

Used by the scanner workers. Deduplicates by (source, external_id).
"""

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.scoring import compute_velocity, quick_sentiment
from app.core.logging import get_logger
from app.models.event import EventSource, IngestedEvent

logger = get_logger(__name__)


class EventIngestionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def ingest_batch(
        self, source: EventSource, events: list[dict]
    ) -> dict:
        """Bulk-upsert events with computed scores. Returns counts."""
        if not events:
            return {"inserted": 0, "skipped": 0}

        rows = []
        for e in events:
            text = e.get("body") or e.get("title") or ""
            rows.append({
                "source": source,
                "external_id": e["external_id"][:256],
                "url": (e.get("url") or "")[:1024] or None,
                "title": (e.get("title") or "")[:512] or None,
                "body": text,
                "author": (e.get("author") or "")[:256] or None,
                "published_at": e["published_at"],
                "engagement": e.get("engagement") or {},
                "velocity_score": compute_velocity(
                    engagement=e.get("engagement"),
                    published_at=e["published_at"],
                    source=source.value,
                ),
                "sentiment_score": quick_sentiment(text),
                "raw": e.get("raw"),
            })

        # ON CONFLICT DO NOTHING — relies on the unique (source, external_id) index
        stmt = pg_insert(IngestedEvent).values(rows)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["source", "external_id"]
        )
        result = await self.db.execute(stmt)
        await self.db.commit()

        inserted = result.rowcount or 0
        logger.info(
            "events.ingest.complete",
            source=source.value,
            inserted=inserted,
            total=len(events),
        )
        return {"inserted": inserted, "total": len(events)}

    async def recent_for_market(
        self,
        market_keywords: list[str],
        *,
        limit: int = 30,
        max_age_hours: int = 48,
    ) -> list[IngestedEvent]:
        """Pull recent events potentially relevant to a market.

        MVP: keyword OR-match across title/body. Production: vector similarity.
        """
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import or_, func

        cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

        if not market_keywords:
            return []

        conditions = []
        for kw in market_keywords:
            kw_lower = kw.lower()
            conditions.append(func.lower(IngestedEvent.body).contains(kw_lower))
            conditions.append(func.lower(IngestedEvent.title).contains(kw_lower))

        result = await self.db.execute(
            select(IngestedEvent)
            .where(IngestedEvent.published_at >= cutoff)
            .where(or_(*conditions))
            .order_by(IngestedEvent.published_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
