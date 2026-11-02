"""Password hashing and signed session tokens."""

import re
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.config import Settings

SESSION_COOKIE = "re_session"
MIN_PASSWORD_LENGTH = 8
USERNAME_PATTERN = re.compile(r"^[a-z0-9._-]{3,50}$")

_hasher = PasswordHasher()
_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_session_token(user_id: int, session_version: int, settings: Settings) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "ver": session_version,
        "iat": now,
        "exp": now + timedelta(hours=settings.session_hours),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


def read_session_token(token: str, settings: Settings) -> tuple[int, int] | None:
    """The (user id, session version) in a valid, unexpired token, or None."""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[_ALGORITHM], options={"require": ["exp"]}
        )
        return int(payload["sub"]), int(payload["ver"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        return None
