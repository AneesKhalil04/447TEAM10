from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.uploads import MAX_FILE_SIZE

client = TestClient(app)
HEADERS = "office,period_start,period_end,visits,students_served,pounds_distributed"
ROW = "Retriever Essentials,2026-10-05,2026-10-11,100,70,1000.5"


def upload(csv: str | bytes, filename: str = "usage.csv"):
    return client.post("/api/uploads/validate", files={"file": (filename, csv, "text/csv")})


def test_valid_upload_normalizes_headers_and_values():
    headers = " Office ,Period-Start,PERIOD END,visits,students_served,pounds_distributed"
    response = upload(f"\ufeff{headers}\r\n{ROW}\r\n", "usage.CSV")
    assert response.status_code == 200
    assert response.json() == {"row_count": 1, "records": [{
        "office": "Retriever Essentials", "period_start": "2026-10-05",
        "period_end": "2026-10-11", "visits": 100, "students_served": 70,
        "pounds_distributed": 1000.5,
    }]}


def test_missing_headers():
    response = upload("office,visits\nPantry,100")
    assert response.status_code == 400
    assert response.json()["errors"][0]["row"] == 1
    assert "Missing required columns" in response.json()["errors"][0]["message"]


@pytest.mark.parametrize("header", [
    "student_id", "Student-Name", " NAME ", "EMAIL", "phone", "address",
])
def test_prohibited_headers(header):
    response = upload(f"{HEADERS},{header}\n{ROW},private")
    assert response.status_code == 400
    assert "personal-data" in response.json()["errors"][0]["message"]
    assert "private" not in response.text


@pytest.mark.parametrize(("field", "value", "message"), [
    (1, "2026-02-30", "valid date"),
    (1, "2026-1-05", "YYYY-MM-DD"),
    (1, "10/05/2026", "YYYY-MM-DD"),
    (1, "2026-10-12", "after period_end"),
    (3, "-1", "non-negative integer"),
    (4, "-2", "non-negative integer"),
    (3, "1.5", "non-negative integer"),
    (5, "-0.1", "non-negative number"),
    (5, "NaN", "finite"),
    (5, "inf", "finite"),
    (0, " ", "cannot be empty"),
    (3, "", "cannot be empty"),
])
def test_invalid_rows(field, value, message):
    values = ROW.split(",")
    values[field] = value
    response = upload(f"{HEADERS}\n{','.join(values)}")
    assert response.status_code == 400
    assert any(error["row"] == 2 and message in error["message"]
               for error in response.json()["errors"])
    assert "records" not in response.json()


@pytest.mark.parametrize("row", ["Pantry,2026-10-05", f"{ROW},extra", '"unclosed'])
def test_malformed_rows(row):
    response = upload(f"{HEADERS}\n{row}")
    assert response.status_code == 400
    assert response.json()["errors"][0]["row"] == 2


def test_incorrect_file_type():
    response = upload(f"{HEADERS}\n{ROW}", "usage.xlsx")
    assert response.status_code == 400


def test_size_limit():
    assert upload(b"x" * (MAX_FILE_SIZE + 1)).status_code == 413


def test_atomic_rejection():
    response = upload(f"{HEADERS}\n{ROW}\nOther,2026-10-05,2026-10-11,-1,4,0")
    assert response.status_code == 400
    assert response.json()["errors"][0]["row"] == 3
    assert "records" not in response.json()
    assert "row_count" not in response.json()


@pytest.mark.parametrize("csv", ["", HEADERS, f"{HEADERS},office\n{ROW},Other"])
def test_empty_or_duplicate_headers(csv):
    assert upload(csv).status_code == 400


def test_quoted_office_and_zero_metrics():
    response = upload(f'{HEADERS}\n"Office, Pantry",2026-10-05,2026-10-11,0,0,0')
    assert response.status_code == 200
    assert response.json()["records"][0]["office"] == "Office, Pantry"


def test_invalid_encoding():
    assert upload(b"\xff\xfe").status_code == 400


def test_cors_preflight():
    response = client.options("/api/uploads/validate", headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_demo_file():
    content = (Path(__file__).parents[2] / "docs" / "demo-dashboard-data.csv").read_bytes()
    response = upload(content)
    assert response.status_code == 200
    result = response.json()
    assert result["row_count"] == 8
    assert len({row["office"] for row in result["records"]}) == 2
    assert len({row["period_start"] for row in result["records"]}) == 4
    assert sum(row["visits"] for row in result["records"]) == 555
    assert sum(row["students_served"] for row in result["records"]) == 379
    assert sum(row["pounds_distributed"] for row in result["records"]) == 4800.5
