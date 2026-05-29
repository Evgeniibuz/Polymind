"""Polymarket Gamma API client — for market discovery & pricing.

Gamma is Polymarket's REST API for browsing events & markets:
https://docs.polymarket.com/developers/gamma-markets-api/overview

Trading happens via the CLOB API (see polymarket_clob.py).
"""

from datetime import datetime
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class PolymarketGammaClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.polymarket_gamma_url).rstrip("/")
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _get(self, path: str, params: dict | None = None) -> Any:
        resp = await self._client.get(f"{self.base_url}{path}", params=params)
        resp.raise_for_status()
        return resp.json()

    async def list_markets(
        self,
        *,
        active: bool = True,
        closed: bool = False,
        limit: int = 100,
        offset: int = 0,
        order: str = "volume24hr",
        ascending: bool = False,
    ) -> list[dict]:
        """List markets — supports pagination & sort.

        Each market dict contains at minimum:
          id, question, slug, category, active, closed,
          outcomePrices (string list), volume24hr, liquidity, endDate
        """
        params = {
            "active": str(active).lower(),
            "closed": str(closed).lower(),
            "limit": limit,
            "offset": offset,
            "order": order,
            "ascending": str(ascending).lower(),
        }
        return await self._get("/markets", params=params)

    async def get_market(self, market_id: str) -> dict:
        return await self._get(f"/markets/{market_id}")

    async def get_events(self, *, active: bool = True, limit: int = 50) -> list[dict]:
        """An 'event' bundles related markets (e.g. all candidates of an election)."""
        return await self._get(
            "/events",
            params={"active": str(active).lower(), "limit": limit},
        )

    async def get_market_history(
        self,
        market_id: str,
        *,
        start_ts: int | None = None,
        interval: str = "1h",
    ) -> list[dict]:
        """Time-series price history for a market."""
        params: dict[str, Any] = {"market": market_id, "interval": interval}
        if start_ts:
            params["startTs"] = start_ts
        return await self._get("/prices-history", params=params)


def parse_market_payload(raw: dict) -> dict:
    """Normalize a Gamma market payload to our internal shape.

    Returns a dict ready to upsert into the markets table.
    """
    # outcomePrices is typically a JSON-encoded string list like '["0.61","0.39"]'
    yes_price = None
    no_price = None
    prices_raw = raw.get("outcomePrices")
    if isinstance(prices_raw, str):
        import orjson
        try:
            prices = orjson.loads(prices_raw)
            if isinstance(prices, list) and len(prices) >= 2:
                yes_price = float(prices[0])
                no_price = float(prices[1])
        except Exception:
            pass
    elif isinstance(prices_raw, list) and len(prices_raw) >= 2:
        yes_price = float(prices_raw[0])
        no_price = float(prices_raw[1])

    end_date_raw = raw.get("endDate")
    end_date = None
    if end_date_raw:
        try:
            end_date = datetime.fromisoformat(end_date_raw.replace("Z", "+00:00"))
        except Exception:
            pass

    return {
        "external_id": str(raw["id"]),
        "slug": raw.get("slug"),
        "question": raw.get("question", "")[:512],
        "description": raw.get("description"),
        "category": _categorize(raw),
        "status": "closed" if raw.get("closed") else "active",
        "yes_price": yes_price,
        "no_price": no_price,
        "volume_24h": float(raw.get("volume24hr") or 0),
        "volume_total": float(raw.get("volume") or 0),
        "liquidity": float(raw.get("liquidity") or 0),
        "end_date": end_date,
        "raw": raw,
    }


def _categorize(raw: dict) -> str:
    """Best-effort category from Polymarket tags."""
    tags = (raw.get("tags") or []) + ([raw.get("category")] if raw.get("category") else [])
    tags_str = " ".join(t.lower() if isinstance(t, str) else str(t) for t in tags)
    text = f"{tags_str} {raw.get('question', '').lower()}"

    if any(k in text for k in ("crypto", "bitcoin", "btc", "ethereum", "eth", "solana")):
        return "crypto"
    if any(k in text for k in ("fed", "rate", "inflation", "gdp", "unemployment", "recession", "cpi")):
        return "macro"
    if any(k in text for k in ("election", "trump", "biden", "president", "congress", "senate")):
        return "politics"
    if any(k in text for k in ("ai", "openai", "tesla", "spacex", "google", "apple", "tech")):
        return "tech"
    if any(k in text for k in ("nba", "nfl", "ufc", "soccer", "world cup", "super bowl")):
        return "sports"
    if any(k in text for k in ("stock", "earnings", "nvda", "msft", "ipo")):
        return "stocks"
    return "other"
