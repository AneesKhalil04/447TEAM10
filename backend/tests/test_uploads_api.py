from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DataSource, Service, ServiceUsage, UploadBatch
from app.seed import seed

SAMPLE_FILE = Path(__file__).resolve().parent.parent / "sample_data" / "upload_sample.csv"
HEADER = "office,week_start,visits,students_served,pounds_distributed"


@pytest.fixture
def source(db: Session) -> DataSource:
    return seed(db)


def upload(client: TestClient, source: DataSource, csv: str, replace: bool = False, name="w.csv"):
    return client.post(
        "/uploads",
        data={"data_source_id": str(source.id), "replace": str(replace).lower()},
        files={"file": (name, csv.encode(), "text/csv")},
    )


def count(db: Session, model) -> int:
    db.expire_all()
    return db.scalar(select(func.count()).select_from(model))


def test_template_lists_the_expected_columns(client: TestClient) -> None:
    response = client.get("/uploads/template")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.text.strip() == (
        "office,service,week_start,visits,students_served,pounds_distributed"
    )


def test_data_sources_are_listed_with_their_office(client: TestClient, source: DataSource) -> None:
    response = client.get("/data-sources")
    assert response.json() == [
        {
            "id": source.id,
            "name": "Weekly service usage",
            "office_id": source.office_id,
            "office": "Retriever Essentials",
        }
    ]


def test_seed_can_run_twice(db: Session, source: DataSource) -> None:
    assert seed(db).id == source.id
    assert count(db, DataSource) == 1


def test_valid_upload_saves_every_row(client: TestClient, db: Session, source: DataSource) -> None:
    response = upload(
        client,
        source,
        f"{HEADER}\nRetriever Essentials,2025-10-13,21,14,120.5\n,2025-10-20,25,16,98\n",
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["row_count"] == 2
    assert body["replaced_rows"] == 0
    assert (body["first_week"], body["last_week"]) == ("2025-10-13", "2025-10-20")
    assert body["office"] == "Retriever Essentials"
    assert count(db, ServiceUsage) == 2


def test_sample_file_uploads_cleanly(client: TestClient, db: Session, source: DataSource) -> None:
    response = client.post(
        "/uploads",
        data={"data_source_id": str(source.id)},
        files={"file": (SAMPLE_FILE.name, SAMPLE_FILE.read_bytes(), "text/csv")},
    )
    assert response.status_code == 201, response.text
    assert response.json()["row_count"] == count(db, ServiceUsage) > 0


def test_any_bad_row_means_nothing_is_saved(
    client: TestClient, db: Session, source: DataSource
) -> None:
    response = upload(client, source, f"{HEADER}\n,2025-10-13,21,14,120\n,2025-10-20,-3,16,98\n")
    assert response.status_code == 422
    body = response.json()
    assert body["message"].startswith("Nothing was saved")
    assert body["errors"] == [{"row": 3, "column": "visits", "message": "Cannot be negative."}]
    assert count(db, UploadBatch) == 0
    assert count(db, ServiceUsage) == 0


def test_rows_for_another_office_are_rejected(client: TestClient, source: DataSource) -> None:
    response = upload(client, source, f"{HEADER}\nEmergency Aid Program,2025-10-13,21,14,0\n")
    assert response.status_code == 422
    assert response.json()["errors"][0]["column"] == "office"


def test_services_must_exist_for_the_office(
    client: TestClient, db: Session, source: DataSource
) -> None:
    db.add(Service(office_id=source.office_id, name="Food pantry"))
    db.commit()
    header = "service,week_start,visits,students_served,pounds_distributed"

    unknown = upload(client, source, f"{header}\nCooking class,2025-10-13,5,5,0\n")
    assert unknown.status_code == 422
    assert unknown.json()["errors"][0]["column"] == "service"

    known = upload(client, source, f"{header}\nfood PANTRY,2025-10-13,5,5,0\n")
    assert known.status_code == 201, known.text


def test_reupload_asks_before_replacing_then_replaces_only_overlapping_weeks(
    client: TestClient, db: Session, source: DataSource
) -> None:
    first = upload(
        client,
        source,
        f"{HEADER}\n,2025-10-13,10,5,1\n,2025-10-20,11,6,2\n,2025-10-27,12,7,3\n",
        name="october.csv",
    )
    assert first.status_code == 201

    second_file = f"{HEADER}\n,2025-10-27,99,50,30\n,2025-11-03,13,8,4\n"
    conflict = upload(client, source, second_file, name="october-fixed.csv")
    assert conflict.status_code == 409
    body = conflict.json()
    assert "already uploaded" in body["message"]
    assert len(body["conflicts"]) == 1
    assert body["conflicts"][0]["filename"] == "october.csv"
    assert body["conflicts"][0]["weeks"] == ["2025-10-27"]
    assert count(db, UploadBatch) == 1  # nothing saved while waiting for confirmation

    replaced = upload(client, source, second_file, replace=True, name="october-fixed.csv")
    assert replaced.status_code == 201, replaced.text
    assert replaced.json()["replaced_rows"] == 1

    db.expire_all()
    visits_by_week = {
        row.week_start.isoformat(): row.visits for row in db.scalars(select(ServiceUsage))
    }
    assert visits_by_week == {
        "2025-10-13": 10,
        "2025-10-20": 11,
        "2025-10-27": 99,
        "2025-11-03": 13,
    }


def test_replace_flag_is_harmless_when_nothing_overlaps(
    client: TestClient, source: DataSource
) -> None:
    response = upload(client, source, f"{HEADER}\n,2025-10-13,1,1,1\n", replace=True)
    assert response.status_code == 201
    assert response.json()["replaced_rows"] == 0


def test_unknown_data_source_is_a_404(client: TestClient) -> None:
    response = client.post(
        "/uploads",
        data={"data_source_id": "999"},
        files={"file": ("w.csv", f"{HEADER}\n,2025-10-13,1,1,1\n".encode(), "text/csv")},
    )
    assert response.status_code == 404


def test_unreadable_and_oversized_files_are_rejected(
    client: TestClient, source: DataSource
) -> None:
    wrong_type = client.post(
        "/uploads",
        data={"data_source_id": str(source.id)},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert wrong_type.status_code == 400

    too_big = client.post(
        "/uploads",
        data={"data_source_id": str(source.id)},
        files={"file": ("big.csv", b"x" * (5 * 1024 * 1024 + 1), "text/csv")},
    )
    assert too_big.status_code == 413
