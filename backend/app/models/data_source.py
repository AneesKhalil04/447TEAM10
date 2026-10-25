from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.office import Office
    from app.models.upload_batch import UploadBatch


class DataSource(Base):
    """A spreadsheet feed an office uploads on a schedule (weekly, monthly)."""

    __tablename__ = "data_source"
    __table_args__ = (UniqueConstraint("office_id", "name", name="uq_data_source_office_id_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    office_id: Mapped[int] = mapped_column(ForeignKey("office.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)

    office: Mapped[Office] = relationship(back_populates="data_sources")
    upload_batches: Mapped[list[UploadBatch]] = relationship(back_populates="data_source")
