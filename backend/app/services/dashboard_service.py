"""Aggregate service usage for the dashboard. Only totals leave this module."""

from datetime import date, timedelta

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models import Office, ServiceUsage
from app.schemas.dashboard import (
    DashboardSummary,
    DateRange,
    OfficeOption,
    OfficeTotal,
    Totals,
    WeeklyTotal,
)

WEEK = timedelta(days=7)

_SUMS = (
    func.coalesce(func.sum(ServiceUsage.visits), 0),
    func.coalesce(func.sum(ServiceUsage.students_served), 0),
    func.coalesce(func.sum(ServiceUsage.pounds_distributed), 0),
)


def _filtered(
    statement: Select, office_id: int | None, start: date | None, end: date | None
) -> Select:
    if office_id is not None:
        statement = statement.where(ServiceUsage.office_id == office_id)
    if start is not None:
        statement = statement.where(ServiceUsage.week_start >= start)
    if end is not None:
        statement = statement.where(ServiceUsage.week_start <= end)
    return statement


def _totals(visits, students_served, pounds) -> Totals:
    return Totals(
        visits=int(visits), students_served=int(students_served), pounds_distributed=float(pounds)
    )


def build_summary(
    db: Session, office_id: int | None, start: date | None, end: date | None
) -> DashboardSummary:
    offices = [
        OfficeOption(id=office.id, name=office.name)
        for office in db.scalars(select(Office).order_by(Office.name))
    ]

    first, last = db.execute(
        select(func.min(ServiceUsage.week_start), func.max(ServiceUsage.week_start))
    ).one()
    data_range = DateRange(start=first, end=last) if first is not None else None

    weeks = [
        WeeklyTotal(week_start=week, **_totals(*sums).model_dump())
        for week, *sums in db.execute(
            _filtered(select(ServiceUsage.week_start, *_SUMS), office_id, start, end)
            .group_by(ServiceUsage.week_start)
            .order_by(ServiceUsage.week_start)
        )
    ]
    # Summed in SQL so pounds stay exact decimals until the final conversion.
    totals = _totals(*db.execute(_filtered(select(*_SUMS), office_id, start, end)).one())

    # Same rule as the original frontend: compare against the equal-length span that
    # ends the week before the first filtered week with data.
    previous_period = previous_totals = None
    if weeks:
        span = weeks[-1].week_start - weeks[0].week_start + WEEK
        prior_end = weeks[0].week_start - WEEK
        prior_start = prior_end - span + WEEK
        prior = select(func.count(ServiceUsage.id), *_SUMS)
        has_rows, *sums = db.execute(_filtered(prior, office_id, prior_start, prior_end)).one()
        if has_rows:
            previous_period = DateRange(start=prior_start, end=prior_end)
            previous_totals = _totals(*sums)

    office_breakdown = [
        OfficeTotal(office_id=office_id_, office=name, **_totals(*sums).model_dump())
        for office_id_, name, *sums in db.execute(
            select(Office.id, Office.name, *_SUMS)
            .join(ServiceUsage, ServiceUsage.office_id == Office.id)
            .group_by(Office.id, Office.name)
            .order_by(_SUMS[0].desc(), Office.name)
        )
    ]

    return DashboardSummary(
        offices=offices,
        data_range=data_range,
        totals=totals,
        weeks=weeks,
        previous_period=previous_period,
        previous_totals=previous_totals,
        office_breakdown=office_breakdown,
    )
