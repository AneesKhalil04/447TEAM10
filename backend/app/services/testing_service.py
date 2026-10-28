"""Reset uploaded data for local demos and testing. Never enabled in a real deployment."""

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import ServiceUsage, UploadBatch
from app.seed import seed
from app.services.upload_parser import read_rows, validate_rows
from app.services.upload_service import resolve_rows, save_upload

SAMPLE_FILE = Path(__file__).resolve().parents[2] / "sample_data" / "upload_sample.csv"


@dataclass
class ResetResult:
    deleted_uploads: int
    deleted_rows: int
    loaded_rows: int


def reset_data(db: Session, load_sample: bool) -> ResetResult:
    """Delete every upload and its rows, then optionally load the sample file as a fresh upload."""
    deleted_rows = db.scalar(select(func.count()).select_from(ServiceUsage)) or 0
    deleted_uploads = db.scalar(select(func.count()).select_from(UploadBatch)) or 0
    db.execute(delete(ServiceUsage))
    db.execute(delete(UploadBatch))
    source = seed(db)  # commits the deletes and makes sure the pilot office exists

    loaded_rows = 0
    if load_sample:
        header, raw = read_rows(SAMPLE_FILE.name, SAMPLE_FILE.read_bytes())
        parsed, errors = validate_rows(header, raw)
        resolved, resolve_errors = resolve_rows(db, source, parsed)
        if errors or resolve_errors:
            raise ValueError(f"{SAMPLE_FILE.name} does not pass validation.")
        loaded_rows = save_upload(db, source, SAMPLE_FILE.name, resolved, []).batch.row_count

    return ResetResult(deleted_uploads, deleted_rows, loaded_rows)
