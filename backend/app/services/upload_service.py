"""Database side of an upload: resolve names, detect re-uploaded weeks, and save.

Saving is all-or-nothing. Either every row of the file is stored in one transaction
or nothing is.
"""

from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import DataSource, Service, ServiceUsage, UploadBatch, UploadStatus
from app.services.upload_parser import ParsedRow, RowError


@dataclass
class ResolvedRow:
    parsed: ParsedRow
    service_id: int | None


@dataclass
class Conflict:
    """Weeks in the new file that an earlier upload already covers."""

    upload_batch_id: int
    filename: str
    uploaded_at: datetime
    service: str | None
    weeks: list[date]
    usage_ids: list[int]


@dataclass
class SaveResult:
    batch: UploadBatch
    replaced_rows: int


def resolve_rows(
    db: Session, data_source: DataSource, rows: list[ParsedRow]
) -> tuple[list[ResolvedRow], list[RowError]]:
    """Check each row's office and service against the database."""
    office = data_source.office
    services = {
        service.name.casefold(): service
        for service in db.scalars(select(Service).where(Service.office_id == office.id))
    }

    resolved: list[ResolvedRow] = []
    errors: list[RowError] = []
    for row in rows:
        if row.office and row.office.casefold() != office.name.casefold():
            errors.append(
                RowError(
                    row.row,
                    "office",
                    f"'{row.office}' does not match this data source's office ({office.name}).",
                )
            )
            continue

        service_id = None
        if row.service:
            service = services.get(row.service.casefold())
            if service is None:
                message = f"'{row.service}' is not a service of {office.name}."
                errors.append(RowError(row.row, "service", message))
                continue
            service_id = service.id
        resolved.append(ResolvedRow(row, service_id))

    return resolved, errors


def find_conflicts(db: Session, office_id: int, rows: list[ResolvedRow]) -> list[Conflict]:
    """Return earlier uploads that already hold any of these office, service and week rows."""
    wanted = {(row.service_id, row.parsed.week_start) for row in rows}
    weeks = {week for _, week in wanted}

    existing = db.execute(
        select(ServiceUsage, UploadBatch, Service.name)
        .join(UploadBatch, ServiceUsage.upload_batch_id == UploadBatch.id)
        .outerjoin(Service, ServiceUsage.service_id == Service.id)
        .where(ServiceUsage.office_id == office_id, ServiceUsage.week_start.in_(weeks))
    ).all()

    grouped: dict[tuple[int, int | None], Conflict] = {}
    for usage, batch, service_name in existing:
        if (usage.service_id, usage.week_start) not in wanted:
            continue
        conflict = grouped.setdefault(
            (batch.id, usage.service_id),
            Conflict(batch.id, batch.filename, batch.uploaded_at, service_name, [], []),
        )
        conflict.weeks.append(usage.week_start)
        conflict.usage_ids.append(usage.id)

    conflicts = sorted(grouped.values(), key=lambda c: (c.uploaded_at, c.upload_batch_id))
    for conflict in conflicts:
        conflict.weeks.sort()
    return conflicts


def save_upload(
    db: Session,
    data_source: DataSource,
    filename: str,
    rows: list[ResolvedRow],
    replace: list[Conflict],
) -> SaveResult:
    """Replace any conflicting rows and store the new batch in a single transaction."""
    replace_ids = [usage_id for conflict in replace for usage_id in conflict.usage_ids]
    try:
        if replace_ids:
            # Delete first so the unique (office, service, week) constraint allows the inserts.
            db.execute(delete(ServiceUsage).where(ServiceUsage.id.in_(replace_ids)))

        batch = UploadBatch(
            data_source=data_source,
            filename=filename,
            status=UploadStatus.SUCCEEDED,
            row_count=len(rows),
        )
        batch.usage_rows = [
            ServiceUsage(
                office_id=data_source.office_id,
                service_id=row.service_id,
                week_start=row.parsed.week_start,
                visits=row.parsed.visits,
                students_served=row.parsed.students_served,
                pounds_distributed=row.parsed.pounds_distributed,
                extra=row.parsed.extra or None,
            )
            for row in rows
        ]
        db.add(batch)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return SaveResult(batch=batch, replaced_rows=len(replace_ids))
