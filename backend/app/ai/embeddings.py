"""OpenAI embeddings — used for deduplicating similar news/tweets."""

from openai import AsyncOpenAI

from app.core.config import settings


class EmbeddingClient:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            self._client = None
            return
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if self._client is None:
            raise RuntimeError("OPENAI_API_KEY not configured")
        if not texts:
            return []
        # text-embedding-3-small: 1536 dims, $0.02/1M tokens
        response = await self._client.embeddings.create(
            model=settings.openai_embedding_model,
            input=texts,
        )
        return [d.embedding for d in response.data]


_emb_singleton: EmbeddingClient | None = None


def get_embedder() -> EmbeddingClient:
    global _emb_singleton
    if _emb_singleton is None:
        _emb_singleton = EmbeddingClient()
    return _emb_singleton
