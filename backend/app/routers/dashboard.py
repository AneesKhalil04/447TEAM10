from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Office
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import build_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Annotated[Session, Depends(get_db)],
    office_id: Annotated[int | None, Query(description="Limit to one office")] = None,
    start: Annotated[date | None, Query(description="First week to include (YYYY-MM-DD)")] = None,
    end: Annotated[date | None, Query(description="Last week to include (YYYY-MM-DD)")] = None,
) -> DashboardSummary:
    """Totals, weekly trend, prior-period comparison, and per-office breakdown."""
    if start and end and start > end:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "start must be on or before end."
        )
    if office_id is not None and db.get(Office, office_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Office {office_id} does not exist.")
    return build_summary(db, office_id, start, end)
