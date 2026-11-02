"""FastAPI dependencies that identify the signed-in user and enforce roles."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.models import Role, StaffUser
from app.security import SESSION_COOKIE, read_session_token


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> StaffUser:
    claims = read_session_token(token, settings) if token else None
    user = db.get(StaffUser, claims[0]) if claims else None
    if user is None or not user.is_active or user.session_version != claims[1]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in.")
    return user


CurrentUser = Annotated[StaffUser, Depends(get_current_user)]


def require_roles(*roles: Role) -> Callable[[StaffUser], StaffUser]:
    def check(user: CurrentUser) -> StaffUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your account cannot do this.")
        return user

    return check


AdminUser = Annotated[StaffUser, Depends(require_roles(Role.ADMIN))]
Uploader = Annotated[StaffUser, Depends(require_roles(Role.ADMIN, Role.STAFF))]
