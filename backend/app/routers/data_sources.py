from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import DataSource
from app.schemas.data_source import DataSourceOut

router = APIRouter(prefix="/data-sources", tags=["data sources"])


@router.get("", response_model=list[DataSourceOut])
def list_data_sources(db: Annotated[Session, Depends(get_db)]) -> list[DataSourceOut]:
    sources = db.scalars(
        select(DataSource).options(joinedload(DataSource.office)).order_by(DataSource.name)
    )
    return [
        DataSourceOut(id=s.id, name=s.name, office_id=s.office_id, office=s.office.name)
        for s in sources
    ]
