from datetime import date

from pydantic import BaseModel, Field


class AggregateRecord(BaseModel):
    office: str
    period_start: date
    period_end: date
    visits: int = Field(ge=0)
    students_served: int = Field(ge=0)
    pounds_distributed: float = Field(ge=0, allow_inf_nan=False)


class UploadResponse(BaseModel):
    row_count: int
    records: list[AggregateRecord]


class UploadError(BaseModel):
    row: int | None = None
    message: str


class UploadErrors(BaseModel):
    errors: list[UploadError]
