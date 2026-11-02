from pydantic import BaseModel

from app.models import Role, StaffUser


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    role: Role
    office_id: int | None
    office: str | None
    is_active: bool

    @classmethod
    def from_user(cls, user: StaffUser) -> "UserOut":
        return cls(
            id=user.id,
            username=user.username,
            role=user.role,
            office_id=user.office_id,
            office=user.office.name if user.office else None,
            is_active=user.is_active,
        )
