"""Verify Solana ed25519 signatures from Phantom wallet.

Flow:
1. Client requests nonce for their address
2. Server stores nonce in Redis with TTL
3. Client signs message containing nonce
4. Server verifies signature against stored nonce
5. Server issues JWT
"""

import secrets
from datetime import datetime, timezone

import base58
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from app.core.redis import redis_client

NONCE_TTL_SECONDS = 300


def _nonce_key(address: str) -> str:
    return f"auth:nonce:{address}"


def build_login_message(address: str, nonce: str) -> str:
    """Human-readable message the user signs in their wallet."""
    return (
        f"Welcome to Polymind!\n\n"
        f"Sign this message to authenticate. This does not authorize any transaction "
        f"or cost any gas.\n\n"
        f"Wallet: {address}\n"
        f"Nonce: {nonce}\n"
        f"Issued: {datetime.now(timezone.utc).isoformat()}"
    )


async def issue_nonce(address: str) -> tuple[str, str]:
    """Generate and store a fresh nonce. Returns (nonce, message-to-sign)."""
    nonce = secrets.token_urlsafe(24)
    await redis_client.setex(_nonce_key(address), NONCE_TTL_SECONDS, nonce)
    return nonce, build_login_message(address, nonce)


async def verify_phantom_signature(
    address: str,
    signature_b58: str,
    nonce: str,
) -> bool:
    """Verify the signature against the message + stored nonce.

    Returns True if signature is valid AND nonce matches AND nonce hasn't expired.
    Consumes the nonce on success (one-time use).
    """
    stored = await redis_client.get(_nonce_key(address))
    if stored is None:
        return False
    stored_str = stored.decode() if isinstance(stored, bytes) else stored
    if stored_str != nonce:
        return False

    message = build_login_message(address, nonce).encode()

    try:
        pubkey_bytes = base58.b58decode(address)
        signature_bytes = base58.b58decode(signature_b58)
    except Exception:
        return False

    if len(pubkey_bytes) != 32:
        return False

    try:
        verify_key = VerifyKey(pubkey_bytes)
        verify_key.verify(message, signature_bytes)
    except BadSignatureError:
        return False
    except Exception:
        return False

    # Consume nonce (prevent replay)
    await redis_client.delete(_nonce_key(address))
    return True
