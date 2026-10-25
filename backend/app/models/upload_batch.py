from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.data_source import DataSource
    from app.models.service_usage import ServiceUsage


class UploadStatus(enum.StrEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class UploadBatch(Base):
    """One uploaded file. Its usage rows are saved only if every row validates."""

    __tablename__ = "upload_batch"

    id: Mapped[int] = mapped_column(primary_key=True)
    data_source_id: Mapped[int] = mapped_column(ForeignKey("data_source.id", ondelete="RESTRICT"))
    filename: Mapped[str] = mapped_column(String(255))
    status: Mapped[UploadStatus] = mapped_column(
        Enum(
            UploadStatus,
            name="upload_status",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
            create_constraint=True,
        ),
        default=UploadStatus.PENDING,
    )
    row_count: Mapped[int] = mapped_column(default=0)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    data_source: Mapped[DataSource] = relationship(back_populates="upload_batches")
    usage_rows: Mapped[list[ServiceUsage]] = relationship(
        back_populates="upload_batch", cascade="all, delete-orphan"
    )
