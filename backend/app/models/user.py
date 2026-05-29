"""User account model."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class AuthProvider(StrEnum):
    PHANTOM = "phantom"
    GOOGLE = "google"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    auth_provider: Mapped[AuthProvider] = mapped_column(String(16), nullable=False)
    # For Phantom: Solana pubkey (base58). For Google: email.
    auth_identifier: Mapped[str] = mapped_column(
        String(256), nullable=False, unique=True, index=True
    )

    display_name: Mapped[str | None] = mapped_column(String(128))
    avatar_url: Mapped[str | None] = mapped_column(String(512))

    # Polymarket trading wallet (proxy). Set after first deposit.
    polymarket_proxy_address: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True
    )

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<User {self.auth_provider}:{self.auth_identifier[:12]}>"
