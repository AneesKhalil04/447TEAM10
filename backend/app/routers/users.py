from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import AdminUser
from app.db import get_db
from app.models import StaffUser
from app.schemas.auth import UserOut
from app.schemas.user import UserCreate, UserUpdate
from app.services.user_service import UserError, create_user, update_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(db: Annotated[Session, Depends(get_db)], _admin: AdminUser) -> list[UserOut]:
    users = db.scalars(
        select(StaffUser).options(joinedload(StaffUser.office)).order_by(StaffUser.username)
    )
    return [UserOut.from_user(user) for user in users]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def add_user(
    body: UserCreate, db: Annotated[Session, Depends(get_db)], _admin: AdminUser
) -> UserOut:
    try:
        user = create_user(db, body.username, body.password, body.role, body.office_id)
    except UserError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
    return UserOut.from_user(user)


@router.patch("/{user_id}", response_model=UserOut)
def change_user(
    user_id: int, body: UserUpdate, db: Annotated[Session, Depends(get_db)], admin: AdminUser
) -> UserOut:
    """Change a role or office, reset a password, or deactivate or reactivate an account."""
    user = db.get(StaffUser, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"User {user_id} does not exist.")
    try:
        update_user(db, user, admin, **body.model_dump(exclude_unset=True))
    except UserError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
    return UserOut.from_user(user)
