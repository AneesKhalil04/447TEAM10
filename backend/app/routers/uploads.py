from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import DataSource
from app.schemas.upload import (
    ConflictOut,
    RowErrorOut,
    UploadConflictResponse,
    UploadErrorResponse,
    UploadResult,
)
from app.services.upload_parser import (
    TEMPLATE_COLUMNS,
    RowError,
    UploadFileError,
    read_rows,
    validate_rows,
)
from app.services.upload_service import find_conflicts, resolve_rows, save_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _error(status_code: int, message: str, errors: list[RowError] | None = None) -> JSONResponse:
    body = UploadErrorResponse(
        message=message,
        errors=[RowErrorOut(row=e.row, column=e.column, message=e.message) for e in errors or []],
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


@router.get("/template", response_class=Response)
def download_template() -> Response:
    """A CSV with just the header row, for offices to fill in."""
    return Response(
        content=",".join(TEMPLATE_COLUMNS) + "\r\n",
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="service_usage_template.csv"'},
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=UploadResult,
    responses={
        400: {"model": UploadErrorResponse, "description": "The file cannot be read"},
        404: {"model": UploadErrorResponse, "description": "Unknown data source"},
        409: {
            "model": UploadConflictResponse,
            "description": "Some weeks were already uploaded. Resend with replace=true.",
        },
        413: {"model": UploadErrorResponse, "description": "The file is too large"},
        422: {"model": UploadErrorResponse, "description": "Row-level validation errors"},
    },
)
async def create_upload(
    file: Annotated[UploadFile, File(description="A .csv or .xlsx file following the template")],
    data_source_id: Annotated[int, Form()],
    db: Annotated[Session, Depends(get_db)],
    replace: Annotated[bool, Form(description="Replace weeks that were already uploaded")] = False,
):
    """Validate a file and save all of its rows, or none of them."""
    data_source = db.get(DataSource, data_source_id)
    if data_source is None:
        return _error(status.HTTP_404_NOT_FOUND, f"Data source {data_source_id} does not exist.")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        return _error(status.HTTP_413_CONTENT_TOO_LARGE, "The file is larger than 5 MB.")

    filename = file.filename or "upload"
    try:
        header, raw_rows = read_rows(filename, content)
    except UploadFileError as error:
        return _error(status.HTTP_400_BAD_REQUEST, str(error))

    parsed, errors = validate_rows(header, raw_rows)
    resolved, resolve_errors = resolve_rows(db, data_source, parsed)
    errors = sorted(errors + resolve_errors, key=lambda e: e.row)
    if errors:
        return _error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Nothing was saved. Fix the {len(errors)} problem(s) below and upload again.",
            errors,
        )

    conflicts = find_conflicts(db, data_source.office_id, resolved)
    if conflicts and not replace:
        body = UploadConflictResponse(
            message=(
                "Some of these weeks were already uploaded. Nothing was saved. "
                "Upload again with replace=true to replace them."
            ),
            conflicts=[
                ConflictOut(
                    upload_batch_id=c.upload_batch_id,
                    filename=c.filename,
                    uploaded_at=c.uploaded_at,
                    service=c.service,
                    weeks=c.weeks,
                )
                for c in conflicts
            ],
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT, content=body.model_dump(mode="json")
        )

    try:
        result = save_upload(db, data_source, filename, resolved, conflicts)
    except IntegrityError:
        # Another upload for the same weeks committed between our check and our save.
        return _error(
            status.HTTP_409_CONFLICT,
            "Another upload changed these weeks at the same time. Nothing was saved. Try again.",
        )

    weeks = [row.parsed.week_start for row in resolved]
    return UploadResult(
        upload_batch_id=result.batch.id,
        filename=result.batch.filename,
        data_source_id=data_source.id,
        office=data_source.office.name,
        row_count=result.batch.row_count,
        replaced_rows=result.replaced_rows,
        first_week=min(weeks),
        last_week=max(weeks),
        uploaded_at=result.batch.uploaded_at,
    )
