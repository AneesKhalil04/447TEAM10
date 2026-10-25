from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.data_source import DataSource
    from app.models.service import Service


class Office(Base):
    """A Dean of Students office (Retriever Essentials is the pilot)."""

    __tablename__ = "office"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    services: Mapped[list[Service]] = relationship(back_populates="office")
    data_sources: Mapped[list[DataSource]] = relationship(back_populates="office")
