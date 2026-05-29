"""Backwards-compatible alias.

Historically the probability engine imported `get_claude` from here. The actual
implementation now lives in `llm_client.py` and is provider-agnostic
(Anthropic / DeepSeek / OpenAI). Keep this shim so existing imports keep working.
"""

from app.ai.llm_client import LLMClient, get_llm

# Alias for older call sites
ClaudeClient = LLMClient


def get_claude() -> LLMClient:
    return get_llm()
