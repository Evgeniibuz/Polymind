"""User service — repository pattern around User model."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AuthProvider, User


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_identifier(
        self, provider: AuthProvider, identifier: str
    ) -> User | None:
        result = await self.db.execute(
            select(User).where(
                User.auth_provider == provider,
                User.auth_identifier == identifier,
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        provider: AuthProvider,
        identifier: str,
        display_name: str | None = None,
        avatar_url: str | None = None,
    ) -> User:
        user = await self.get_by_identifier(provider, identifier)
        if user is None:
            user = User(
                auth_provider=provider,
                auth_identifier=identifier,
                display_name=display_name,
                avatar_url=avatar_url,
            )
            self.db.add(user)

        user.last_login_at = datetime.now(timezone.utc)
        if display_name and not user.display_name:
            user.display_name = display_name
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url

        await self.db.commit()
        await self.db.refresh(user)
        return user
