from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.db import get_db
from app.models import Office
from app.schemas.user import OfficeOut

router = APIRouter(prefix="/offices", tags=["offices"])


@router.get("", response_model=list[OfficeOut])
def list_offices(db: Annotated[Session, Depends(get_db)], _user: CurrentUser) -> list[OfficeOut]:
    offices = db.scalars(select(Office).order_by(Office.name))
    return [OfficeOut(id=office.id, name=office.name) for office in offices]
