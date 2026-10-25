from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import DataSource, Office, Service, ServiceUsage, UploadBatch, UploadStatus


def make_batch(db: Session) -> UploadBatch:
    office = Office(name="Retriever Essentials")
    source = DataSource(office=office, name="Weekly pantry export")
    batch = UploadBatch(data_source=source, filename="week1.csv")
    db.add(batch)
    db.flush()
    return batch


def make_usage(batch: UploadBatch, **overrides) -> ServiceUsage:
    values = {
        "upload_batch": batch,
        "office": batch.data_source.office,
        "week_start": date(2025, 10, 13),
        "visits": 21,
        "students_served": 14,
        "pounds_distributed": Decimal("120.50"),
    }
    values.update(overrides)
    return ServiceUsage(**values)


def test_upload_batch_defaults(db: Session) -> None:
    batch = make_batch(db)
    db.commit()
    assert batch.status is UploadStatus.PENDING
    assert batch.row_count == 0
    assert batch.uploaded_at is not None


def test_usage_rows_link_to_office_service_and_batch(db: Session) -> None:
    batch = make_batch(db)
    pantry = Service(office=batch.data_source.office, name="Food pantry")
    db.add(make_usage(batch, service=pantry, extra={"volunteers": 4}))
    db.commit()

    row = db.scalars(select(ServiceUsage)).one()
    assert row.office.name == "Retriever Essentials"
    assert row.service is pantry
    assert row.upload_batch is batch
    assert row.pounds_distributed == Decimal("120.50")
    assert row.extra == {"volunteers": 4}


@pytest.mark.parametrize("column", ["visits", "students_served", "pounds_distributed"])
def test_negative_counts_are_rejected(db: Session, column: str) -> None:
    db.add(make_usage(make_batch(db), **{column: -1}))
    with pytest.raises(IntegrityError):
        db.commit()


def test_office_names_are_unique(db: Session) -> None:
    db.add_all([Office(name="Retriever Essentials"), Office(name="Retriever Essentials")])
    with pytest.raises(IntegrityError):
        db.commit()


def test_service_names_are_unique_per_office(db: Session) -> None:
    first, second = Office(name="Retriever Essentials"), Office(name="Career Center")
    db.add_all(
        [
            Service(office=first, name="Food pantry"),
            Service(office=second, name="Food pantry"),
        ]
    )
    db.commit()

    db.add(Service(office=first, name="Food pantry"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_deleting_a_batch_removes_its_usage_rows(db: Session) -> None:
    batch = make_batch(db)
    db.add_all([make_usage(batch), make_usage(batch, week_start=date(2025, 10, 20))])
    db.commit()

    db.delete(batch)
    db.commit()
    assert db.scalar(select(func.count()).select_from(ServiceUsage)) == 0
