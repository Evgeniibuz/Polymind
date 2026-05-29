"""Market sync service — pulls markets from Polymarket Gamma into our DB."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.integrations.kalshi import KalshiClient, parse_kalshi_market
from app.integrations.polymarket_gamma import (
    PolymarketGammaClient,
    parse_market_payload,
)
from app.models.market import Market, MarketSource

logger = get_logger(__name__)


class MarketSyncService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def sync_polymarket(self, *, limit: int = 200) -> dict:
        """Pull active Polymarket markets and upsert into DB.

        Returns stats: {created, updated, total}.
        """
        client = PolymarketGammaClient()
        try:
            raw_markets = await client.list_markets(active=True, limit=limit)
        finally:
            await client.close()

        created = updated = 0
        for raw in raw_markets:
            try:
                parsed = parse_market_payload(raw)
            except Exception as e:
                logger.warning(
                    "market.parse.error",
                    error=str(e),
                    raw_id=raw.get("id"),
                )
                continue

            existing = await self._get_by_external(
                MarketSource.POLYMARKET, parsed["external_id"]
            )
            if existing is None:
                market = Market(source=MarketSource.POLYMARKET, **parsed)
                market.last_synced_at = datetime.now(timezone.utc)
                self.db.add(market)
                created += 1
            else:
                # Update mutable fields
                for k, v in parsed.items():
                    if k != "external_id":
                        setattr(existing, k, v)
                existing.last_synced_at = datetime.now(timezone.utc)
                updated += 1

        await self.db.commit()
        logger.info(
            "market.sync.complete",
            source="polymarket",
            created=created,
            updated=updated,
            total=len(raw_markets),
        )
        return {"created": created, "updated": updated, "total": len(raw_markets)}

    async def _get_by_external(
        self, source: MarketSource, external_id: str
    ) -> Market | None:
        result = await self.db.execute(
            select(Market).where(
                Market.source == source, Market.external_id == external_id
            )
        )
        return result.scalar_one_or_none()

    async def sync_kalshi(self, *, limit: int = 200) -> dict:
        """Pull active Kalshi markets and upsert into DB."""
        client = KalshiClient()
        try:
            data = await client.list_markets(limit=limit, status="open")
            raw_markets = data.get("markets", [])
        except Exception as e:
            logger.warning("market.sync.kalshi.error", error=str(e))
            return {"created": 0, "updated": 0, "total": 0}
        finally:
            await client.close()

        created = updated = 0
        for raw in raw_markets:
            try:
                parsed = parse_kalshi_market(raw)
            except Exception as e:
                logger.warning("kalshi.parse.error", error=str(e), ticker=raw.get("ticker"))
                continue

            existing = await self._get_by_external(MarketSource.KALSHI, parsed["external_id"])
            if existing is None:
                market = Market(source=MarketSource.KALSHI, **parsed)
                market.last_synced_at = datetime.now(timezone.utc)
                self.db.add(market)
                created += 1
            else:
                for k, v in parsed.items():
                    if k != "external_id":
                        setattr(existing, k, v)
                existing.last_synced_at = datetime.now(timezone.utc)
                updated += 1

        await self.db.commit()
        logger.info(
            "market.sync.complete", source="kalshi",
            created=created, updated=updated, total=len(raw_markets),
        )
        return {"created": created, "updated": updated, "total": len(raw_markets)}
