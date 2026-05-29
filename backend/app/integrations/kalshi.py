"""Kalshi API client — for market discovery & pricing.

Kalshi is a CFTC-regulated US prediction market. We use it as a second
price source to enable cross-market arbitrage (same event, different odds).

Auth: Kalshi uses email/password to get a token, OR API key (RSA) for the
newer API. We support the simple token flow here.

Docs: https://trading-api.readme.io/reference/getting-started
"""

from datetime import datetime
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class KalshiClient:
    def __init__(self) -> None:
        self.base_url = settings.kalshi_base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=30.0)
        self._token: str | None = None

    async def close(self) -> None:
        await self._client.aclose()

    async def _login(self) -> None:
        """Authenticate and cache the bearer token."""
        if not (settings.kalshi_email and settings.kalshi_password):
            raise RuntimeError("KALSHI credentials not configured")
        resp = await self._client.post(
            f"{self.base_url}/login",
            json={"email": settings.kalshi_email, "password": settings.kalshi_password},
        )
        resp.raise_for_status()
        self._token = resp.json()["token"]

    async def _headers(self) -> dict:
        if self._token is None:
            await self._login()
        return {"Authorization": f"Bearer {self._token}"}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _get(self, path: str, params: dict | None = None) -> Any:
        headers = await self._headers()
        resp = await self._client.get(
            f"{self.base_url}{path}", params=params, headers=headers
        )
        if resp.status_code == 401:
            # Token expired — re-login once
            self._token = None
            headers = await self._headers()
            resp = await self._client.get(
                f"{self.base_url}{path}", params=params, headers=headers
            )
        resp.raise_for_status()
        return resp.json()

    async def list_markets(
        self, *, limit: int = 100, status: str = "open", cursor: str | None = None
    ) -> dict:
        """List markets. Returns {markets: [...], cursor: str}."""
        params: dict[str, Any] = {"limit": min(limit, 1000), "status": status}
        if cursor:
            params["cursor"] = cursor
        return await self._get("/markets", params=params)

    async def get_market(self, ticker: str) -> dict:
        data = await self._get(f"/markets/{ticker}")
        return data.get("market", data)


def parse_kalshi_market(raw: dict) -> dict:
    """Normalize a Kalshi market to our internal market shape.

    Kalshi prices are in cents (0-100). yes_bid/yes_ask give the book.
    We use the mid-price as the YES probability.
    """
    yes_bid = raw.get("yes_bid", 0) or 0
    yes_ask = raw.get("yes_ask", 0) or 0
    if yes_bid and yes_ask:
        yes_price = (yes_bid + yes_ask) / 2 / 100.0
    elif raw.get("last_price"):
        yes_price = raw["last_price"] / 100.0
    else:
        yes_price = None

    end_date = None
    if raw.get("close_time"):
        try:
            end_date = datetime.fromisoformat(raw["close_time"].replace("Z", "+00:00"))
        except Exception:
            pass

    return {
        "external_id": raw["ticker"],
        "slug": raw.get("ticker"),
        "question": (raw.get("title") or raw.get("subtitle") or "")[:512],
        "description": raw.get("rules_primary"),
        "category": _categorize(raw),
        "status": "active" if raw.get("status") == "open" else "closed",
        "yes_price": yes_price,
        "no_price": round(1 - yes_price, 4) if yes_price is not None else None,
        "volume_24h": float(raw.get("volume_24h") or 0),
        "volume_total": float(raw.get("volume") or 0),
        "liquidity": float(raw.get("liquidity") or 0) / 100.0,
        "end_date": end_date,
        "raw": raw,
    }


def _categorize(raw: dict) -> str:
    text = f"{raw.get('category', '')} {raw.get('title', '')}".lower()
    if any(k in text for k in ("crypto", "bitcoin", "btc", "ethereum", "eth")):
        return "crypto"
    if any(k in text for k in ("fed", "rate", "inflation", "gdp", "cpi", "recession")):
        return "macro"
    if any(k in text for k in ("election", "president", "senate", "congress")):
        return "politics"
    if any(k in text for k in ("ai", "openai", "tesla", "tech")):
        return "tech"
    if any(k in text for k in ("nba", "nfl", "ufc", "game")):
        return "sports"
    if any(k in text for k in ("stock", "earnings", "ipo", "nasdaq")):
        return "stocks"
    return "other"


_kalshi_singleton: KalshiClient | None = None


def get_kalshi_client() -> KalshiClient:
    global _kalshi_singleton
    if _kalshi_singleton is None:
        _kalshi_singleton = KalshiClient()
    return _kalshi_singleton
