from __future__ import annotations

import enum
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models._types import JSONType


class AuditAction(enum.StrEnum):
    UPLOAD = "upload"  # a file was saved
    REPLACE = "replace"  # a file was saved and replaced weeks from earlier uploads


class AuditLog(Base):
    """Who uploaded what. Entries outlive the users and uploads they mention."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_id: Mapped[int | None] = mapped_column(ForeignKey("staff_user.id", ondelete="SET NULL"))
    # Copied so the entry still reads correctly if the account or upload is later removed.
    username: Mapped[str] = mapped_column(String(50))
    action: Mapped[AuditAction] = mapped_column(
        Enum(
            AuditAction,
            name="audit_action",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
            create_constraint=True,
        )
    )
    upload_batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("upload_batch.id", ondelete="SET NULL")
    )
    office: Mapped[str] = mapped_column(String(120))
    filename: Mapped[str] = mapped_column(String(255))
    details: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict)
