from datetime import date

from pydantic import BaseModel, Field


class Totals(BaseModel):
    visits: int
    students_served: int
    pounds_distributed: float


class WeeklyTotal(Totals):
    week_start: date


class OfficeTotal(Totals):
    office_id: int
    office: str


class OfficeOption(BaseModel):
    id: int
    name: str


class DateRange(BaseModel):
    start: date
    end: date


class DashboardSummary(BaseModel):
    offices: list[OfficeOption]
    data_range: DateRange | None = Field(
        description="First and last week with any data, across all offices"
    )
    totals: Totals
    weeks: list[WeeklyTotal]
    previous_period: DateRange | None = Field(
        description="The equal-length span just before the filtered weeks, if it has data"
    )
    previous_totals: Totals | None
    office_breakdown: list[OfficeTotal] = Field(
        description="Totals per office over all data, ignoring the filters"
    )
