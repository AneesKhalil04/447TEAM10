from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models._types import JSONType

if TYPE_CHECKING:
    from app.models.office import Office
    from app.models.service import Service
    from app.models.upload_batch import UploadBatch


class ServiceUsage(Base):
    """Aggregated weekly totals for one office (and optionally one service)."""

    __tablename__ = "service_usage"
    __table_args__ = (
        CheckConstraint("visits >= 0", name="visits_non_negative"),
        CheckConstraint("students_served >= 0", name="students_served_non_negative"),
        CheckConstraint("pounds_distributed >= 0", name="pounds_distributed_non_negative"),
        Index("ix_service_usage_office_id_week_start", "office_id", "week_start"),
        # One row per office, service and week, so re-uploads must replace rather than
        # double count. NULLS NOT DISTINCT makes rows with no service collide too (Postgres 15+).
        UniqueConstraint(
            "office_id",
            "service_id",
            "week_start",
            name="uq_service_usage_office_id_service_id_week_start",
            postgresql_nulls_not_distinct=True,
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    upload_batch_id: Mapped[int] = mapped_column(
        ForeignKey("upload_batch.id", ondelete="CASCADE"), index=True
    )
    office_id: Mapped[int] = mapped_column(ForeignKey("office.id", ondelete="RESTRICT"))
    service_id: Mapped[int | None] = mapped_column(ForeignKey("service.id", ondelete="RESTRICT"))
    week_start: Mapped[date]
    visits: Mapped[int]
    students_served: Mapped[int]
    pounds_distributed: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    # Office-specific columns that are not part of the standard template.
    extra: Mapped[dict[str, Any] | None] = mapped_column(JSONType)

    upload_batch: Mapped[UploadBatch] = relationship(back_populates="usage_rows")
    office: Mapped[Office] = relationship()
    service: Mapped[Service | None] = relationship()
