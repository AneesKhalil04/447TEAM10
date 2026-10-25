from datetime import date, datetime

from pydantic import BaseModel


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
