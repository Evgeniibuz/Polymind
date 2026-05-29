"""Polymind FastAPI application entrypoint."""

from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.api.v1 import (
    analytics,
    auth,
    bots,
    health,
    markets,
    positions,
    signals,
    whales,
)
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.redis import redis_client

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.env,
            traces_sample_rate=0.1,
        )
    logger.info("app.startup", env=settings.env, debug=settings.debug)
    yield
    await redis_client.close()
    logger.info("app.shutdown")


app = FastAPI(
    title="Polymind API",
    description="AI intelligence backend for prediction markets",
    version="0.1.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
P = settings.api_v1_prefix
app.include_router(health.router)  # /health, /ready (no prefix)
app.include_router(auth.router, prefix=P)
app.include_router(markets.router, prefix=P)
app.include_router(signals.router, prefix=P)
app.include_router(bots.router, prefix=P)
app.include_router(positions.router, prefix=P)
app.include_router(whales.router, prefix=P)
app.include_router(analytics.router, prefix=P)


@app.get("/")
async def root() -> dict:
    return {
        "name": "Polymind API",
        "version": "0.1.0",
        "docs": "/docs",
        "status": "operational",
    }
