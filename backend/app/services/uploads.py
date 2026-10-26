import csv
import io
import math
import re
from datetime import date

from app.schemas.uploads import AggregateRecord, UploadError, UploadResponse

REQUIRED = (
    "office", "period_start", "period_end", "visits", "students_served", "pounds_distributed",
)
PROHIBITED = {"student_id", "student_name", "name", "email", "phone", "address"}
MAX_FILE_SIZE = 5 * 1024 * 1024


class InvalidUpload(Exception):
    def __init__(self, errors: list[UploadError]):
        self.errors = errors


def reject(row: int | None, message: str) -> None:
    raise InvalidUpload([UploadError(row=row, message=message)])


def validate_csv(content: bytes) -> UploadResponse:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        reject(None, "Use a UTF-8 encoded CSV file.")
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    records = []
    errors = []
    row_number = 1
    try:
        raw_headers = next(reader, [])
        headers = [re.sub(r"[\s-]+", "_", header.strip().lower()) for header in raw_headers]
        prohibited = sorted(PROHIBITED.intersection(headers))
        if prohibited:
            reject(1, f"Remove personal-data columns: {', '.join(prohibited)}.")
        missing = [header for header in REQUIRED if header not in headers]
        if missing:
            reject(1, f"Missing required columns: {', '.join(missing)}.")
        if any(not header for header in headers) or len(set(headers)) != len(headers):
            reject(1, "Headers must be non-empty and unique.")
        while True:
            row_number = reader.line_num + 1
            values = next(reader, None)
            if values is None:
                break
            if not values:  # Ignore blank lines, but not rows of empty fields.
                continue
            if len(values) != len(headers):
                errors.append(UploadError(
                    row=row_number, message="Field count must match headers.",
                ))
                continue
            data = dict(zip(headers, (value.strip() for value in values), strict=True))
            row_errors = []
            for field in REQUIRED:
                if not data[field]:
                    row_errors.append(f"{field} cannot be empty.")
            dates = {}
            for field in ("period_start", "period_end"):
                try:
                    if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", data[field]):
                        raise ValueError
                    dates[field] = date.fromisoformat(data[field])
                except ValueError:
                    row_errors.append(f"{field} must be a valid date in YYYY-MM-DD format.")
            if len(dates) == 2 and dates["period_start"] > dates["period_end"]:
                row_errors.append("period_start cannot be after period_end.")
            for field in ("visits", "students_served"):
                if not re.fullmatch(r"[0-9]+", data[field]):
                    row_errors.append(f"{field} must be a non-negative integer.")
            try:
                pounds = float(data["pounds_distributed"])
                if not math.isfinite(pounds) or pounds < 0:
                    raise ValueError
            except ValueError:
                row_errors.append("pounds_distributed must be a finite non-negative number.")
            if row_errors:
                errors.extend(
                    UploadError(row=row_number, message=message) for message in row_errors
                )
            else:
                records.append(AggregateRecord(
                    office=data["office"], **dates, visits=int(data["visits"]),
                    students_served=int(data["students_served"]), pounds_distributed=pounds,
                ))
    except (csv.Error, ValueError) as exc:
        reject(row_number, f"Malformed CSV: {exc}.")
    if errors:
        raise InvalidUpload(errors)
    if not records:
        reject(None, "The CSV must contain at least one data row.")
    return UploadResponse(row_count=len(records), records=records)
