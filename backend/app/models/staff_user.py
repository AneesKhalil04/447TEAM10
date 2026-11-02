from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.office import Office


class Role(enum.StrEnum):
    ADMIN = "admin"  # everything, including managing users
    STAFF = "staff"  # uploads for their own office
    LEADERSHIP = "leadership"  # views the dashboard only


class StaffUser(Base):
    """Someone who can sign in. Accounts are created and managed by admins."""

    __tablename__ = "staff_user"
    __table_args__ = (
        CheckConstraint("role != 'staff' OR office_id IS NOT NULL", name="staff_has_office"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(
            Role,
            name="staff_role",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
            create_constraint=True,
        )
    )
    office_id: Mapped[int | None] = mapped_column(ForeignKey("office.id", ondelete="RESTRICT"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Bumped when the password is reset or the account is deactivated, which signs out
    # every session issued before the change.
    session_version: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    office: Mapped[Office | None] = relationship()
