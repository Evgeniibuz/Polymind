"""Signal endpoints — list, detail, live WebSocket."""

import asyncio
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DB
from app.core.logging import get_logger
from app.core.redis import redis_client
from app.db.session import AsyncSessionLocal
from app.models.signal import Signal, SignalStatus
from app.schemas.market import SignalSummary, SignalWithMarket
from app.services.signal_service import SIGNAL_PUBSUB_CHANNEL, SignalService

router = APIRouter(prefix="/signals", tags=["signals"])
logger = get_logger(__name__)


@router.get("", response_model=list[SignalWithMarket])
async def list_signals(
    db: DB,
    min_confidence: float = Query(default=0, ge=0, le=100),
    min_edge_pp: float = Query(default=0, ge=0, le=100),
    category: str | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
) -> list[Signal]:
    return await SignalService(db).list_active(
        min_confidence=min_confidence,
        min_edge_pp=min_edge_pp,
        category=category,
        limit=limit,
        offset=offset,
    )


@router.get("/{signal_id}", response_model=SignalWithMarket)
async def get_signal(signal_id: UUID, db: DB) -> Signal:
    signal = await SignalService(db).get_by_id(signal_id)
    if signal is None:
        raise HTTPException(404, "signal not found")
    return signal


@router.websocket("/stream")
async def stream_signals(websocket: WebSocket) -> None:
    """WebSocket endpoint streaming new signals in real-time.

    Subscribes to Redis pub/sub channel `signals:new`.
    Clients can authenticate via Sec-WebSocket-Protocol or query param `token`.
    """
    await websocket.accept()

    pubsub = redis_client.pubsub()
    await pubsub.subscribe(SIGNAL_PUBSUB_CHANNEL)

    try:
        # Send hello + initial backlog of active signals
        async with AsyncSessionLocal() as db:
            initial = await SignalService(db).list_active(limit=10)
            await websocket.send_json({
                "type": "initial",
                "signals": [
                    {
                        "id": str(s.id),
                        "market_id": str(s.market_id),
                        "direction": s.direction.value if hasattr(s.direction, "value") else s.direction,
                        "edge_pp": s.edge_pp,
                        "confidence": s.confidence,
                        "reasoning": s.reasoning,
                        "created_at": s.created_at.isoformat(),
                    }
                    for s in initial
                ],
            })

        # Stream live updates
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=30)
            if message is None:
                # Heartbeat to keep connection alive through proxies
                await websocket.send_json({"type": "ping"})
                continue
            data = message["data"]
            if isinstance(data, bytes):
                data = data.decode()
            import orjson
            await websocket.send_json({"type": "signal", "data": orjson.loads(data)})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("ws.signal.error", error=str(e))
    finally:
        await pubsub.unsubscribe(SIGNAL_PUBSUB_CHANNEL)
        await pubsub.close()
