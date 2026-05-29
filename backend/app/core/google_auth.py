"""Verify Google OAuth ID tokens."""

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings


class GoogleAuthError(Exception):
    pass


def verify_google_id_token(token: str) -> dict:
    """Verify ID token and return user info dict.

    Raises GoogleAuthError on any verification failure.
    Returns dict with at least: email, name, picture.
    """
    if not settings.google_client_id:
        raise GoogleAuthError("Google OAuth not configured")

    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.google_client_id,
            clock_skew_in_seconds=10,
        )
    except ValueError as e:
        raise GoogleAuthError(f"invalid token: {e}") from e

    if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise GoogleAuthError("invalid issuer")
    if not info.get("email_verified"):
        raise GoogleAuthError("email not verified")

    return {
        "email": info["email"],
        "name": info.get("name"),
        "picture": info.get("picture"),
        "sub": info["sub"],  # Google's stable user id
    }
