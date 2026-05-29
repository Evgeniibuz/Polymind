"""Polymarket CLOB (Central Limit Order Book) client for trade execution.

Wraps py-clob-client with our async-friendly interface. Trades are non-custodial:
the user signs through their Phantom wallet or the bot signs with its own private key.

For non-custodial bot trading, users delegate a session-scoped signer key.
For MVP we use server-side signing with POLYMARKET_PRIVATE_KEY (single proxy wallet
for the Polymind bot operator). In production, each user has their own proxy.

Docs: https://docs.polymarket.com/developers/CLOB/introduction
"""

from typing import Literal

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class PolymarketTradingError(Exception):
    pass


class PolymarketCLOBClient:
    """Async wrapper around py-clob-client.

    Operates in two modes:
      - read-only (no private key) — order book queries, prices
      - trading (private key configured) — place/cancel orders
    """

    def __init__(self) -> None:
        self._client = None
        self._initialized = False

    def _ensure_client(self) -> object:
        if self._client is not None:
            return self._client
        try:
            from py_clob_client.client import ClobClient
        except ImportError as e:
            raise PolymarketTradingError("py_clob_client not installed") from e

        if not settings.polymarket_private_key:
            # Read-only mode
            self._client = ClobClient(host=settings.polymarket_clob_url, chain_id=137)
        else:
            self._client = ClobClient(
                host=settings.polymarket_clob_url,
                key=settings.polymarket_private_key,
                chain_id=137,
                funder=settings.polymarket_funder or None,
            )
            # Derive API key for L2 endpoints
            self._client.set_api_creds(self._client.create_or_derive_api_creds())

        self._initialized = True
        return self._client

    async def get_order_book(self, token_id: str) -> dict:
        """Fetch order book for a market token (YES or NO side)."""
        import asyncio
        client = self._ensure_client()
        return await asyncio.to_thread(client.get_order_book, token_id)

    async def get_price(self, token_id: str, side: Literal["buy", "sell"]) -> float:
        """Best bid/ask for a token."""
        import asyncio
        client = self._ensure_client()
        result = await asyncio.to_thread(client.get_price, token_id, side)
        return float(result.get("price", 0))

    async def place_market_order(
        self,
        token_id: str,
        side: Literal["BUY", "SELL"],
        size_usd: float,
    ) -> dict:
        """Place a market order. Returns order receipt with tx hash.

        Raises PolymarketTradingError if not configured for trading.
        """
        if not settings.polymarket_private_key:
            raise PolymarketTradingError("trading not configured — no private key")

        import asyncio
        from py_clob_client.clob_types import MarketOrderArgs, OrderType

        client = self._ensure_client()
        args = MarketOrderArgs(token_id=token_id, amount=size_usd, side=side)
        signed = await asyncio.to_thread(client.create_market_order, args)
        result = await asyncio.to_thread(client.post_order, signed, OrderType.FOK)

        logger.info("polymarket.order.placed", token_id=token_id, side=side, size=size_usd)
        return result


_clob_singleton: PolymarketCLOBClient | None = None


def get_clob_client() -> PolymarketCLOBClient:
    global _clob_singleton
    if _clob_singleton is None:
        _clob_singleton = PolymarketCLOBClient()
    return _clob_singleton
