from pydantic import BaseModel, Field

from app.models import Role


class UserCreate(BaseModel):
    username: str
    password: str
    role: Role
    office_id: int | None = Field(default=None, description="Required for staff")


class UserUpdate(BaseModel):
    """Only the fields that are sent are changed."""

    role: Role | None = None
    office_id: int | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, description="Sets a new password")


class OfficeOut(BaseModel):
    id: int
    name: str
