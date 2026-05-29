"""Cross-market arbitrage — finds the same event priced differently across venues.

Strategy:
  1. Pull active markets from both Polymarket and Kalshi
  2. Match equivalent markets via embedding similarity on the question text
  3. When YES prices diverge beyond a threshold, emit an arbitrage signal

A matched pair where Polymarket YES = 0.38 and Kalshi YES = 0.45 means you can
buy YES on Polymarket and NO on Kalshi for a hedged, low-risk position.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import get_embedder
from app.core.logging import get_logger
from app.models.market import Market, MarketSource, MarketStatus

logger = get_logger(__name__)

# Minimum cosine similarity for two questions to be considered the same event
MATCH_THRESHOLD = 0.86
# Minimum price spread (in probability) to flag as arbitrage
MIN_SPREAD = 0.04


@dataclass(slots=True)
class ArbitragePair:
    poly_market: Market
    kalshi_market: Market
    similarity: float
    spread: float
    cheap_venue: str  # where to buy YES
    expensive_venue: str
    expected_edge_pp: float


def _cosine(a: list[float], b: list[float]) -> float:
    import math
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class ArbitrageService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _active_markets(self, source: MarketSource) -> list[Market]:
        result = await self.db.execute(
            select(Market)
            .where(Market.source == source)
            .where(Market.status == MarketStatus.ACTIVE)
            .where(Market.yes_price.isnot(None))
            .order_by(Market.volume_24h.desc())
            .limit(150)
        )
        return list(result.scalars().all())

    async def find_pairs(self) -> list[ArbitragePair]:
        """Find matched arbitrage pairs across Polymarket & Kalshi."""
        poly = await self._active_markets(MarketSource.POLYMARKET)
        kalshi = await self._active_markets(MarketSource.KALSHI)

        if not poly or not kalshi:
            logger.info("arb.skip", poly=len(poly), kalshi=len(kalshi))
            return []

        embedder = get_embedder()
        try:
            poly_emb = await embedder.embed([m.question for m in poly])
            kalshi_emb = await embedder.embed([m.question for m in kalshi])
        except Exception as e:
            logger.warning("arb.embed.error", error=str(e))
            return []

        pairs: list[ArbitragePair] = []
        for i, pm in enumerate(poly):
            best_j, best_sim = -1, 0.0
            for j, km in enumerate(kalshi):
                sim = _cosine(poly_emb[i], kalshi_emb[j])
                if sim > best_sim:
                    best_sim, best_j = sim, j

            if best_j < 0 or best_sim < MATCH_THRESHOLD:
                continue

            km = kalshi[best_j]
            if pm.yes_price is None or km.yes_price is None:
                continue

            spread = abs(pm.yes_price - km.yes_price)
            if spread < MIN_SPREAD:
                continue

            cheap = "polymarket" if pm.yes_price < km.yes_price else "kalshi"
            expensive = "kalshi" if cheap == "polymarket" else "polymarket"

            pairs.append(ArbitragePair(
                poly_market=pm,
                kalshi_market=km,
                similarity=round(best_sim, 4),
                spread=round(spread, 4),
                cheap_venue=cheap,
                expensive_venue=expensive,
                expected_edge_pp=round(spread * 100, 2),
            ))

        pairs.sort(key=lambda p: p.spread, reverse=True)
        logger.info("arb.pairs.found", count=len(pairs))
        return pairs
