"""Authentication request/response schemas."""

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


# ----- Phantom (Solana wallet) -----
class NonceRequest(BaseModel):
    address: str = Field(min_length=32, max_length=64, description="Solana public key")


class NonceResponse(BaseModel):
    nonce: str
    message: str  # human-readable message the user signs
    expires_in: int = 300


class PhantomVerifyRequest(BaseModel):
    address: str
    signature: str  # base58-encoded ed25519 signature
    nonce: str


# ----- Google OAuth -----
class GoogleVerifyRequest(BaseModel):
    id_token: str


# ----- Common token response -----
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


# ----- User -----
class UserPublic(ORMModel):
    id: str
    auth_provider: str
    auth_identifier: str
    display_name: str | None
    avatar_url: str | None
    polymarket_proxy_address: str | None
