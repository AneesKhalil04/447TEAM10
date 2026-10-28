from datetime import date, datetime

from pydantic import BaseModel, Field


class RowErrorOut(BaseModel):
    row: int
    column: str | None
    message: str


class UploadErrorResponse(BaseModel):
    message: str
    errors: list[RowErrorOut] = []


class ConflictOut(BaseModel):
    upload_batch_id: int
    filename: str
    uploaded_at: datetime
    service: str | None
    weeks: list[date]


class UploadConflictResponse(BaseModel):
    message: str
    conflicts: list[ConflictOut]


class UploadResult(BaseModel):
    upload_batch_id: int
    filename: str
    data_source_id: int
    office: str
    row_count: int
    replaced_rows: int
    first_week: date
    last_week: date
    uploaded_at: datetime


class UploadHistoryItem(BaseModel):
    upload_batch_id: int
    filename: str
    office: str
    uploaded_at: datetime
    row_count: int = Field(description="Rows in the file when it was uploaded")
    weeks_kept: int = Field(description="Rows still in use; later uploads may have replaced some")
    first_week: date | None
    last_week: date | None
