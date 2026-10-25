from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import DataSource, Office, Service, ServiceUsage, UploadBatch


@pytest.fixture
def offices(db: Session) -> dict[str, Office]:
    """Two offices with two weeks each, matching the frontend's test fixture."""
    pilot = Office(name="Retriever Essentials")
    aid = Office(name="Emergency Aid Program")
    rows = [
        (pilot, date(2026, 1, 5), 100, 70, "1000"),
        (pilot, date(2026, 1, 12), 120, 80, "1200"),
        (aid, date(2026, 1, 5), 10, 8, "0"),
        (aid, date(2026, 1, 12), 15, 12, "0"),
    ]
    for office in (pilot, aid):
        batch = UploadBatch(data_source=DataSource(office=office, name="Weekly"), filename="w.csv")
        batch.usage_rows = [
            ServiceUsage(
                office=office,
                week_start=week,
                visits=visits,
                students_served=students,
                pounds_distributed=Decimal(pounds),
            )
            for row_office, week, visits, students, pounds in rows
            if row_office is office
        ]
        db.add(batch)
    db.commit()
    return {"pilot": pilot, "aid": aid}


def summary(client: TestClient, **params) -> dict:
    response = client.get("/dashboard/summary", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_empty_database_returns_zeros(client: TestClient) -> None:
    body = summary(client)
    assert body["totals"] == {"visits": 0, "students_served": 0, "pounds_distributed": 0}
    assert body["weeks"] == []
    assert body["data_range"] is None
    assert body["previous_totals"] is None
    assert body["office_breakdown"] == []


def test_default_view_totals_every_office(client: TestClient, offices) -> None:
    body = summary(client)
    assert body["totals"] == {"visits": 245, "students_served": 170, "pounds_distributed": 2200}
    assert body["data_range"] == {"start": "2026-01-05", "end": "2026-01-12"}
    assert [o["name"] for o in body["offices"]] == ["Emergency Aid Program", "Retriever Essentials"]
    assert [
        (w["week_start"], w["visits"], w["students_served"], w["pounds_distributed"])
        for w in body["weeks"]
    ] == [("2026-01-05", 110, 78, 1000), ("2026-01-12", 135, 92, 1200)]


def test_office_filter(client: TestClient, offices) -> None:
    body = summary(client, office_id=offices["aid"].id)
    assert body["totals"] == {"visits": 25, "students_served": 20, "pounds_distributed": 0}
    # The breakdown always covers every office so they can be compared.
    assert [row["office"] for row in body["office_breakdown"]] == [
        "Retriever Essentials",
        "Emergency Aid Program",
    ]


def test_date_filter_compares_with_the_prior_period(client: TestClient, offices) -> None:
    body = summary(client, start="2026-01-12", office_id=offices["pilot"].id)
    assert body["totals"] == {"visits": 120, "students_served": 80, "pounds_distributed": 1200}
    assert body["previous_period"] == {"start": "2026-01-05", "end": "2026-01-05"}
    assert body["previous_totals"] == {
        "visits": 100,
        "students_served": 70,
        "pounds_distributed": 1000,
    }


def test_no_prior_data_means_no_comparison(client: TestClient, offices) -> None:
    body = summary(client)
    assert body["previous_period"] is None
    assert body["previous_totals"] is None


def test_filter_with_no_matching_weeks(client: TestClient, offices) -> None:
    body = summary(client, start="2027-01-01")
    assert body["weeks"] == []
    assert body["totals"]["visits"] == 0
    assert body["previous_totals"] is None
    assert body["data_range"] == {"start": "2026-01-05", "end": "2026-01-12"}


def test_services_in_the_same_week_are_combined(client: TestClient, db: Session) -> None:
    office = Office(name="Retriever Essentials")
    batch = UploadBatch(data_source=DataSource(office=office, name="Weekly"), filename="w.csv")
    week = date(2026, 1, 5)
    batch.usage_rows = [
        ServiceUsage(
            office=office,
            service=Service(office=office, name=name),
            week_start=week,
            visits=visits,
            students_served=1,
            pounds_distributed=Decimal(pounds),
        )
        for name, visits, pounds in [("Pantry", 3, "0.10"), ("Aid", 4, "0.20")]
    ]
    db.add(batch)
    db.commit()

    body = summary(client)
    assert body["weeks"] == [
        {"week_start": "2026-01-05", "visits": 7, "students_served": 2, "pounds_distributed": 0.3}
    ]
    assert body["totals"]["pounds_distributed"] == 0.3


def test_bad_filters_are_rejected(client: TestClient, offices) -> None:
    reversed_range = {"start": "2026-02-01", "end": "2026-01-01"}
    assert client.get("/dashboard/summary", params=reversed_range).status_code == 422
    assert client.get("/dashboard/summary", params={"office_id": 999}).status_code == 404
    assert client.get("/dashboard/summary", params={"start": "not-a-date"}).status_code == 422
