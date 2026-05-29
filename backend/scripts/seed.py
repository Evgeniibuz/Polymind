"""Seed the database with demo data matching the frontend mock.

Run:  python -m scripts.seed
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.db.session import session_scope
from app.models.market import Market, MarketCategory, MarketSource, MarketStatus
from app.models.signal import Signal, SignalDirection, SignalStatus
from app.models.whale import WhaleTag, WhaleWallet

DEMO_MARKETS = [
    ("Will Bitcoin close above $120K on Dec 31?", "crypto", 0.38, 0.61, 4_200_000, 87, +23,
     "Onchain whale accumulation +340% past 7d. Social sentiment 78% bullish but odds lagging 12h."),
    ("Fed cuts rates by 50bps in March meeting?", "macro", 0.22, 0.41, 8_700_000, 82, +19,
     "CPI print 0.3pp below consensus. Powell dovish in last 3 speeches. Market underpricing pivot."),
    ("Tesla delivers >500K vehicles Q1?", "stocks", 0.64, 0.47, 1_800_000, 74, -17,
     "China production reports below trend. Insider selling +180% MoM. Market over-extrapolating Q4."),
    ("OpenAI announces GPT-6 before April?", "tech", 0.18, 0.35, 920_000, 71, +17,
     "Sam Altman cryptic posts +5x normal cadence. Three SF datacenter contractors confirmed scaling."),
    ("Eurozone enters recession by Q2 2026?", "macro", 0.44, 0.58, 2_100_000, 69, +14,
     "German manufacturing PMI 46.2. ECB minutes signal concern. Forward EUR curve inverted."),
    ("Ethereum ETF approval before June?", "crypto", 0.52, 0.71, 3_400_000, 84, +19,
     "BlackRock filing amendments. SEC dialogue tone shifted positive in March hearings."),
]

DEMO_WHALES = [
    ("0x7a3fc8210000000000000000000000000000c821", "Whale #14", WhaleTag.WHALE, 92, 2_400_000),
    ("0x9c1ebf420000000000000000000000000000bf42", "Smart Money", WhaleTag.SMART_MONEY, 88, 3_100_000),
    ("0x4f88aa1d0000000000000000000000000000aa1d", "Whale #07", WhaleTag.WHALE, 79, 880_000),
    ("0xab2c3e9f00000000000000000000000000003e9f", "Polymarket OG", WhaleTag.POLYMARKET_OG, 84, 1_900_000),
]


async def seed() -> None:
    async with session_scope() as db:
        now = datetime.now(timezone.utc)

        # Markets + signals
        for i, (q, cat, yes, ai, vol, conf, edge, reasoning) in enumerate(DEMO_MARKETS):
            market = Market(
                source=MarketSource.POLYMARKET,
                external_id=f"demo-{i+1}",
                slug=f"demo-market-{i+1}",
                question=q,
                category=MarketCategory(cat),
                status=MarketStatus.ACTIVE,
                yes_price=yes,
                no_price=round(1 - yes, 3),
                volume_24h=Decimal(str(vol)),
                volume_total=Decimal(str(vol * 5)),
                liquidity=Decimal(str(vol // 4)),
                end_date=now + timedelta(days=30),
                last_synced_at=now,
            )
            db.add(market)
            await db.flush()  # get market.id

            db.add(Signal(
                market_id=market.id,
                direction=SignalDirection.YES if edge > 0 else SignalDirection.NO,
                status=SignalStatus.ACTIVE,
                market_probability=yes,
                ai_probability=ai,
                edge_pp=float(edge),
                confidence=float(conf),
                reasoning=reasoning,
                evidence={
                    "social": 78, "onchain": 92, "news": 71,
                    "whales": 84, "historical": 58,
                    "key_drivers": ["Whale accumulation", "Social lead", "News velocity"],
                },
                expires_at=now + timedelta(hours=6),
            ))

        # Whales
        for addr, label, tag, conf, vol in DEMO_WHALES:
            db.add(WhaleWallet(
                address=addr,
                label=label,
                tag=tag,
                confidence_score=float(conf),
                total_volume_usd=Decimal(str(vol)),
                realized_pnl_usd=Decimal(str(vol // 10)),
                win_rate=conf - 10,
                total_positions=42,
                is_active=True,
                last_activity_at=now,
            ))

        print("✓ Seeded", len(DEMO_MARKETS), "markets +", len(DEMO_WHALES), "whales")


if __name__ == "__main__":
    asyncio.run(seed())
