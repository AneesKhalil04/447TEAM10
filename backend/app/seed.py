"""Create the pilot office and its data source. Safe to run more than once.

    python -m app.seed
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import DataSource, Office

PILOT_OFFICE = "Retriever Essentials"
PILOT_DATA_SOURCE = "Weekly service usage"


def seed(db: Session) -> DataSource:
    office = db.scalar(select(Office).where(Office.name == PILOT_OFFICE))
    if office is None:
        office = Office(name=PILOT_OFFICE, description="UMBC's basic needs hub (pilot office).")
        db.add(office)
        db.flush()  # assigns office.id for the lookup below

    source = db.scalar(
        select(DataSource).where(DataSource.office == office, DataSource.name == PILOT_DATA_SOURCE)
    )
    if source is None:
        source = DataSource(
            office=office,
            name=PILOT_DATA_SOURCE,
            description="Weekly export following the service usage upload template.",
        )
        db.add(source)

    db.commit()
    return source


if __name__ == "__main__":
    with SessionLocal() as session:
        data_source = seed(session)
        print(f"Data source {data_source.id}: {PILOT_OFFICE} / {PILOT_DATA_SOURCE}")
