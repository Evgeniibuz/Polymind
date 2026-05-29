"""Authentication endpoints — Phantom + Google."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DB, CurrentUser
from app.core.google_auth import GoogleAuthError, verify_google_id_token
from app.core.phantom import issue_nonce, verify_phantom_signature
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import AuthProvider
from app.schemas.auth import (
    GoogleVerifyRequest,
    NonceRequest,
    NonceResponse,
    PhantomVerifyRequest,
    RefreshRequest,
    TokenResponse,
    UserPublic,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/phantom/nonce", response_model=NonceResponse)
async def phantom_nonce(payload: NonceRequest) -> NonceResponse:
    nonce, message = await issue_nonce(payload.address)
    return NonceResponse(nonce=nonce, message=message)


@router.post("/phantom/verify", response_model=TokenResponse)
async def phantom_verify(payload: PhantomVerifyRequest, db: DB) -> TokenResponse:
    ok = await verify_phantom_signature(
        address=payload.address,
        signature_b58=payload.signature,
        nonce=payload.nonce,
    )
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid signature or nonce")

    user = await UserService(db).get_or_create(
        AuthProvider.PHANTOM, payload.address
    )
    return _issue_tokens(user.id)


@router.post("/google/verify", response_model=TokenResponse)
async def google_verify(payload: GoogleVerifyRequest, db: DB) -> TokenResponse:
    try:
        info = verify_google_id_token(payload.id_token)
    except GoogleAuthError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e

    user = await UserService(db).get_or_create(
        AuthProvider.GOOGLE,
        info["email"],
        display_name=info.get("name"),
        avatar_url=info.get("picture"),
    )
    return _issue_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest) -> TokenResponse:
    try:
        decoded = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    from uuid import UUID
    return _issue_tokens(UUID(decoded["sub"]))


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUser) -> UserPublic:
    return UserPublic.model_validate({
        "id": str(user.id),
        "auth_provider": user.auth_provider.value if hasattr(user.auth_provider, "value") else user.auth_provider,
        "auth_identifier": user.auth_identifier,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "polymarket_proxy_address": user.polymarket_proxy_address,
    })


def _issue_tokens(user_id) -> TokenResponse:
    from app.core.config import settings
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )
