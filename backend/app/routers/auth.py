from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.config import Settings, get_settings
from app.db import get_db
from app.models import StaffUser
from app.schemas.auth import LoginRequest, UserOut
from app.security import SESSION_COOKIE, create_session_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Checked against when the username is unknown, so both failures take the same time.
_DUMMY_HASH = hash_password("not-a-real-password")


@router.post("/login", response_model=UserOut)
def login(
    credentials: LoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserOut:
    """Check a username and password and start an 8-hour session cookie."""
    username = credentials.username.strip().lower()
    user = db.scalar(select(StaffUser).where(StaffUser.username == username))
    password_ok = verify_password(user.password_hash if user else _DUMMY_HASH, credentials.password)
    if user is None or not password_ok or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password.")

    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(user.id, user.session_version, settings),
        max_age=settings.session_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return UserOut.from_user(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, settings: Annotated[Settings, Depends(get_settings)]) -> None:
    response.delete_cookie(
        SESSION_COOKIE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.from_user(user)
