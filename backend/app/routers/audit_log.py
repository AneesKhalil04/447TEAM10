from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import AdminUser
from app.db import get_db
from app.models import AuditAction, AuditLog

router = APIRouter(prefix="/audit-log", tags=["audit log"])

AUDIT_LIMIT = 50


class AuditEntryOut(BaseModel):
    id: int
    created_at: datetime
    username: str
    action: AuditAction
    office: str
    filename: str
    upload_batch_id: int | None
    details: dict[str, Any]


@router.get("", response_model=list[AuditEntryOut])
def list_audit_log(
    db: Annotated[Session, Depends(get_db)], _admin: AdminUser
) -> list[AuditEntryOut]:
    """The most recent uploads and replacements, newest first."""
    entries = db.scalars(
        select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(AUDIT_LIMIT)
    )
    return [
        AuditEntryOut(
            id=e.id,
            created_at=e.created_at,
            username=e.username,
            action=e.action,
            office=e.office,
            filename=e.filename,
            upload_batch_id=e.upload_batch_id,
            details=e.details,
        )
        for e in entries
    ]
