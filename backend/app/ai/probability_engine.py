"""Probability engine — estimates true probability and produces reasoning.

Pipeline:
  1. Gather recent events linked to the market (via embedding similarity + keyword)
  2. Compute structured features: social velocity, sentiment, news count, whale flow
  3. Ask Claude to estimate true probability + reasoning
  4. Score confidence based on signal strength & consistency

Returns a SignalEstimate dict ready to insert as a Signal row.
"""

from dataclasses import dataclass
from typing import Any

from app.ai.llm_client import get_llm
from app.core.logging import get_logger

logger = get_logger(__name__)


PROBABILITY_SYSTEM_PROMPT = """You are Polymind, an AI quant analyst specializing in prediction markets.

Given a market question, its current odds, and recent signals (news, social posts, onchain activity, whale positions), estimate the true probability of the YES outcome.

Be rigorous:
- Weight signals by source quality and recency
- Discount low-quality or speculative content
- Consider base rates and historical patterns
- Identify whether the market is over- or under-pricing
- Quantify uncertainty in your confidence score

Be concise. Be specific. Cite the strongest evidence in your reasoning."""


PROBABILITY_SCHEMA_HINT = """{
  "ai_probability": float,        // 0.0 to 1.0 — your estimate of YES probability
  "confidence": float,            // 0 to 100 — how confident you are in this estimate
  "direction": "yes" | "no",      // which side to bet
  "reasoning": string,            // 1-2 sentences explaining why the market is mispriced (or fair)
  "evidence": {
    "social": float,              // 0-100, strength of social momentum signal
    "onchain": float,             // 0-100
    "news": float,                // 0-100
    "whales": float,              // 0-100
    "historical": float           // 0-100, base-rate / historical-pattern strength
  },
  "key_drivers": [string]         // bullet list of top 3-5 specific evidence points
}"""


@dataclass(slots=True)
class SignalEstimate:
    ai_probability: float
    market_probability: float
    edge_pp: float
    confidence: float
    direction: str
    reasoning: str
    evidence: dict[str, float]
    key_drivers: list[str]


def _format_signals_block(signals: list[dict]) -> str:
    """Render structured signals as a numbered list for the LLM."""
    if not signals:
        return "No recent signals available."
    lines = []
    for i, s in enumerate(signals[:30], 1):
        ts = s.get("published_at", "")
        source = s.get("source", "?")
        title = (s.get("title") or s.get("body") or "")[:200]
        engagement = s.get("engagement", {})
        eng_summary = ""
        if engagement:
            metric_parts = [f"{k}={v}" for k, v in engagement.items() if v]
            if metric_parts:
                eng_summary = f" [{', '.join(metric_parts[:3])}]"
        lines.append(f"{i}. [{source}@{ts}] {title}{eng_summary}")
    return "\n".join(lines)


async def estimate_probability(
    *,
    market_question: str,
    market_yes_price: float,
    market_volume: float,
    market_category: str,
    end_date: str | None,
    recent_signals: list[dict],
    whale_summary: dict | None = None,
) -> SignalEstimate | None:
    """Run the LLM probability estimate. Returns None on failure."""

    llm = get_llm()
    signals_block = _format_signals_block(recent_signals)
    whale_block = ""
    if whale_summary:
        whale_block = (
            f"\nWhale activity: net flow ${whale_summary.get('net_flow_usd', 0):,.0f}, "
            f"{whale_summary.get('long_count', 0)} long YES, "
            f"{whale_summary.get('short_count', 0)} long NO"
        )

    user_prompt = f"""Market: {market_question}
Category: {market_category}
End date: {end_date or 'unknown'}
Current market YES price: {market_yes_price:.3f} ({market_yes_price * 100:.1f}%)
24h volume: ${market_volume:,.0f}
{whale_block}

Recent signals ({len(recent_signals)} items):
{signals_block}

Estimate the true probability of YES and produce your output."""

    try:
        result = await llm.complete_json(
            system=PROBABILITY_SYSTEM_PROMPT,
            user=user_prompt,
            schema_hint=PROBABILITY_SCHEMA_HINT,
            max_tokens=800,
        )
    except Exception as e:
        logger.warning("probability.llm.error", error=str(e), market=market_question[:60])
        return None

    try:
        ai_prob = float(result["ai_probability"])
        confidence = float(result["confidence"])
        edge_pp = round((ai_prob - market_yes_price) * 100, 2)
        # Direction must align with edge sign
        direction = "yes" if edge_pp > 0 else "no"
        return SignalEstimate(
            ai_probability=ai_prob,
            market_probability=market_yes_price,
            edge_pp=edge_pp,
            confidence=confidence,
            direction=direction,
            reasoning=result.get("reasoning", "")[:1000],
            evidence={k: float(v) for k, v in (result.get("evidence") or {}).items()},
            key_drivers=list(result.get("key_drivers", []))[:8],
        )
    except (KeyError, ValueError, TypeError) as e:
        logger.warning("probability.parse.error", error=str(e), raw=result)
        return None
