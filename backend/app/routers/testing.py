from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.services.testing_service import reset_data

router = APIRouter(prefix="/testing", tags=["testing"])


class TestToolsStatus(BaseModel):
    enabled: bool


class ResetRequest(BaseModel):
    load_sample: bool = True


class ResetResponse(BaseModel):
    deleted_uploads: int
    deleted_rows: int
    loaded_rows: int


@router.get("", response_model=TestToolsStatus)
def test_tools_status(settings: Annotated[Settings, Depends(get_settings)]) -> TestToolsStatus:
    """Whether the frontend should show the Testing tab."""
    return TestToolsStatus(enabled=settings.enable_test_tools)


@router.post("/reset", response_model=ResetResponse)
def reset(
    request: ResetRequest,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ResetResponse:
    """Delete all uploaded data, then optionally reload the sample year. Disabled by default."""
    if not settings.enable_test_tools:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Test tools are turned off (set ENABLE_TEST_TOOLS=true)."
        )
    result = reset_data(db, request.load_sample)
    return ResetResponse(
        deleted_uploads=result.deleted_uploads,
        deleted_rows=result.deleted_rows,
        loaded_rows=result.loaded_rows,
    )
