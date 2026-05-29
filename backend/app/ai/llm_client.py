"""Provider-agnostic LLM client.

Supports three backends, switchable via AI_PROVIDER in .env:
  - anthropic  → Claude (native Anthropic SDK)
  - deepseek   → DeepSeek V4 (OpenAI-compatible API)
  - openai     → GPT (OpenAI SDK)

DeepSeek & OpenAI share the OpenAI ChatCompletions format, so they use the same
code path with a different base_url + key. Anthropic uses its own SDK because the
message/system shape differs.

This is the single place that talks to an LLM — everything else calls get_llm().
"""

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMClient:
    """Unified async LLM wrapper."""

    def __init__(self) -> None:
        self.provider = (settings.ai_provider or "anthropic").lower()
        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        if self.provider == "anthropic":
            if not settings.anthropic_api_key:
                self._client = None
                return
            import anthropic
            self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        elif self.provider in ("deepseek", "openai"):
            from openai import AsyncOpenAI
            if self.provider == "deepseek":
                key = settings.deepseek_api_key
                base_url = settings.deepseek_base_url
            else:
                key = settings.openai_api_key
                base_url = None  # default OpenAI endpoint
            if not key:
                self._client = None
                return
            self._client = AsyncOpenAI(api_key=key, base_url=base_url)
        else:
            raise ValueError(f"unknown AI_PROVIDER: {self.provider}")

    @property
    def model(self) -> str:
        if self.provider == "anthropic":
            return settings.anthropic_model
        if self.provider == "deepseek":
            return settings.deepseek_model
        return settings.openai_chat_model

    @property
    def configured(self) -> bool:
        return self._client is not None

    async def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 1024,
        temperature: float = 0.3,
    ) -> str:
        if self._client is None:
            raise RuntimeError(f"AI provider '{self.provider}' not configured (missing API key)")

        if self.provider == "anthropic":
            resp = await self._client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return "".join(
                block.text for block in resp.content if block.type == "text"
            ).strip()

        # OpenAI-compatible (DeepSeek / OpenAI): system goes in the messages list
        resp = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return (resp.choices[0].message.content or "").strip()

    async def complete_json(
        self,
        *,
        system: str,
        user: str,
        schema_hint: str,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> dict:
        """Force a JSON object response across all providers."""
        import orjson

        full_system = (
            f"{system}\n\n"
            f"Respond ONLY with a JSON object matching this schema. "
            f"No markdown, no explanation, no code fences — pure JSON:\n{schema_hint}"
        )

        # OpenAI-compatible providers support response_format=json_object natively
        if self.provider in ("deepseek", "openai") and self._client is not None:
            try:
                resp = await self._client.chat.completions.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": full_system},
                        {"role": "user", "content": user},
                    ],
                )
                raw = (resp.choices[0].message.content or "").strip()
                return orjson.loads(_strip_fences(raw))
            except Exception as e:
                logger.warning("llm.json.native_failed", provider=self.provider, error=str(e))
                # fall through to text+parse

        raw = await self.complete(
            system=full_system, user=user, max_tokens=max_tokens, temperature=temperature
        )
        return orjson.loads(_strip_fences(raw))


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    return text.strip()


_llm_singleton: LLMClient | None = None


def get_llm() -> LLMClient:
    global _llm_singleton
    if _llm_singleton is None:
        _llm_singleton = LLMClient()
    return _llm_singleton
