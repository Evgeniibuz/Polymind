"""Onchain whale tracking — observes large positions on Polymarket via Polygon.

Polymarket markets settle on Polygon. The CTF (Conditional Token Framework)
contract emits Transfer events; we monitor these for large holders.
"""

from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# Polymarket conditional token framework address on Polygon
POLYMARKET_CTF_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"

# Min USD position size to qualify as a "whale"
WHALE_USD_THRESHOLD = 50_000


class OnchainClient:
    def __init__(self) -> None:
        self._w3 = None

    def _get_web3(self):
        if self._w3 is None:
            if not settings.alchemy_polygon_rpc:
                raise RuntimeError("ALCHEMY_POLYGON_RPC not configured")
            from web3 import AsyncWeb3
            from web3.providers.async_rpc import AsyncHTTPProvider
            self._w3 = AsyncWeb3(AsyncHTTPProvider(settings.alchemy_polygon_rpc))
        return self._w3

    async def get_recent_large_trades(
        self,
        *,
        from_block: int | None = None,
        min_usd: float = WHALE_USD_THRESHOLD,
    ) -> list[dict]:
        """Scan recent blocks for large position changes.

        For MVP, this is a stub. Production: subscribe to CTF Transfer events,
        filter by USDC value, resolve token_id -> market, store in DB.

        Returns list of dicts with: wallet_address, market_token_id, size_usd, tx_hash, block_ts.
        """
        # Placeholder implementation — wire to real Alchemy webhooks in production
        logger.info("onchain.scan.stub", min_usd=min_usd)
        return []

    async def get_wallet_positions(self, address: str) -> list[dict]:
        """Get current positions for a wallet across all Polymarket markets."""
        # Stub — query CTF balanceOf per token_id, or use Polymarket subgraph
        # The Graph: https://thegraph.com/explorer/subgraph?id=Polymarket
        logger.info("onchain.wallet.stub", address=address)
        return []


_onchain_singleton: OnchainClient | None = None


def get_onchain_client() -> OnchainClient:
    global _onchain_singleton
    if _onchain_singleton is None:
        _onchain_singleton = OnchainClient()
    return _onchain_singleton
