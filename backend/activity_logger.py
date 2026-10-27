from datetime import datetime, timezone
from typing import Any, Dict, Optional
import os

import jwt


def _decode_token_verified(token: str, secret: str = None) -> Dict[str, Any]:
    """Decode and verify JWT token signature.
    
    Args:
        token: The JWT token to decode
        secret: The secret key for verification. If not provided, attempts to get from environment.
        
    Returns:
        Decoded token payload, or empty dict if verification fails
    """
    if not secret:
        secret = os.getenv('JWT_SECRET_KEY')
    
    if not secret:
        return {}
    
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256", "RS256"],
        )
    except Exception:
        return {}


def resolve_user_identity(request, db=None, jwt_secret: str = None) -> Dict[str, Optional[str]]:
    """Best-effort identity resolution from auth header, headers, payload, and optional DB lookup.
    
    Args:
        request: Flask request object
        db: MongoDB database connection (optional)
        jwt_secret: JWT secret for token verification. If not provided, attempts to get from environment.
    """
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]

    payload = _decode_token_verified(token, jwt_secret) if token else {}
    request_json = request.get_json(silent=True) or {}

    # GHSA-p7p9-jc8p-p38m: identity must come from a verified JWT payload only.
    # Caller-supplied headers (X-User-ID, X-Wallet-Address) and query/body fields
    # are unauthenticated and must not be trusted as identity sources.
    user_id = (
        payload.get("user_id")
        or payload.get("sub")
        or payload.get("uid")
        or payload.get("wallet_address")
    )

    wallet_address = payload.get("wallet_address")

    email = payload.get("email")

    # Prefer wallet as canonical identity when available.
    if wallet_address:
        wallet_address = str(wallet_address).lower().strip()
        user_id = wallet_address

    # If only email is known and DB exists, resolve to canonical user id.
    if not user_id and email and db is not None:
        user = db.users.find_one({"email": str(email).lower().strip()})
        if user:
            if user.get("wallet_address"):
                user_id = str(user.get("wallet_address")).lower().strip()
                wallet_address = user_id
            elif user.get("_id"):
                user_id = str(user.get("_id"))

    if user_id:
        user_id = str(user_id).strip()

    return {
        "user_id": user_id,
        "wallet_address": wallet_address,
        "email": str(email).lower().strip() if email else None,
    }


def log_user_activity(
    db,
    user_id: Optional[str],
    activity_type: str,
    title: str,
    description: str,
    metadata: Optional[Dict[str, Any]] = None,
    points_earned: int = 0,
) -> bool:
    """Write a user activity event. Returns True on success, False otherwise."""
    if not user_id:
        return False

    now_utc = datetime.now(timezone.utc)
    doc = {
        "user_id": str(user_id),
        "type": activity_type,
        "title": title,
        "description": description,
        "occurred_at": now_utc,
        "completed_at": now_utc,
        "timestamp_utc": now_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "points_earned": int(points_earned or 0),
        "metadata": metadata or {},
        "source": "user_activity_events",
    }

    try:
        db.user_activity_events.insert_one(doc)
        return True
    except Exception:
        return False