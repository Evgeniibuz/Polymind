"""Bot management endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DB, CurrentUser
from app.schemas.bot import BotCreate, BotResponse, BotUpdate
from app.services.bot_service import BotService

router = APIRouter(prefix="/bots", tags=["bots"])


@router.get("", response_model=list[BotResponse])
async def list_bots(user: CurrentUser, db: DB) -> list:
    return await BotService(db).list_for_user(user.id)


@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def create_bot(payload: BotCreate, user: CurrentUser, db: DB):
    return await BotService(db).create(user, payload)


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(bot_id: UUID, user: CurrentUser, db: DB):
    bot = await BotService(db).get_for_user(user.id, bot_id)
    if bot is None:
        raise HTTPException(404, "bot not found")
    return bot


@router.patch("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: UUID, payload: BotUpdate, user: CurrentUser, db: DB
):
    service = BotService(db)
    bot = await service.get_for_user(user.id, bot_id)
    if bot is None:
        raise HTTPException(404, "bot not found")
    return await service.update(bot, payload)


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bot(bot_id: UUID, user: CurrentUser, db: DB):
    service = BotService(db)
    bot = await service.get_for_user(user.id, bot_id)
    if bot is None:
        raise HTTPException(404, "bot not found")
    await service.delete(bot)
