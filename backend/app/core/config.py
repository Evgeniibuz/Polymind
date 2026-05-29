"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ----- App -----
    env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"
    secret_key: str = Field(min_length=32)
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://127.0.0.1:5500"

    @computed_field
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ----- Database -----
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # ----- Redis -----
    redis_url: str

    # ----- JWT -----
    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # ----- Google OAuth -----
    google_client_id: str = ""
    google_client_secret: str = ""

    # ----- AI -----
    # Which LLM backend to use: "anthropic" | "deepseek" | "openai"
    ai_provider: str = "anthropic"

    # Anthropic (Claude)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"

    # DeepSeek (OpenAI-compatible). Models: deepseek-v4-flash | deepseek-v4-pro
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-v4-flash"

    # OpenAI — embeddings always, optionally also chat
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"

    # ----- Polymarket -----
    polymarket_gamma_url: str = "https://gamma-api.polymarket.com"
    polymarket_clob_url: str = "https://clob.polymarket.com"
    polymarket_private_key: str = ""
    polymarket_funder: str = ""

    # ----- Kalshi -----
    kalshi_base_url: str = "https://trading-api.kalshi.com/trade-api/v2"
    kalshi_email: str = ""
    kalshi_password: str = ""

    # ----- Twitter/X -----
    twitter_bearer_token: str = ""

    # ----- Telegram -----
    telegram_api_id: int = 0
    telegram_api_hash: str = ""
    telegram_session: str = ""

    # ----- Reddit -----
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "polymind/0.1"

    # ----- News -----
    newsapi_key: str = ""

    # ----- Onchain -----
    alchemy_polygon_rpc: str = ""
    alchemy_solana_rpc: str = ""
    helius_api_key: str = ""

    # ----- Observability -----
    sentry_dsn: str = ""

    @computed_field
    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
