import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.main import app
from app.models import ServiceUsage, UploadBatch
from app.seed import seed

HEADER = "office,week_start,visits,students_served,pounds_distributed"


@pytest.fixture
def tools_enabled():
    app.dependency_overrides[get_settings] = lambda: Settings(enable_test_tools=True)
    yield
    app.dependency_overrides.pop(get_settings, None)


def count(db: Session, model) -> int:
    db.expire_all()
    return db.scalar(select(func.count()).select_from(model))


def upload_one_week(client: TestClient, db: Session) -> None:
    source = seed(db)
    response = client.post(
        "/uploads",
        data={"data_source_id": str(source.id)},
        files={"file": ("w.csv", f"{HEADER}\n,2025-10-13,1,1,1\n".encode(), "text/csv")},
    )
    assert response.status_code == 201


def test_tools_are_off_by_default(client: TestClient, db: Session) -> None:
    upload_one_week(client, db)
    assert client.get("/testing").json() == {"enabled": False}
    assert client.post("/testing/reset", json={"load_sample": False}).status_code == 403
    assert count(db, ServiceUsage) == 1


def test_reset_can_clear_everything(client: TestClient, db: Session, tools_enabled) -> None:
    upload_one_week(client, db)
    assert client.get("/testing").json() == {"enabled": True}

    response = client.post("/testing/reset", json={"load_sample": False})
    assert response.status_code == 200
    assert response.json() == {"deleted_uploads": 1, "deleted_rows": 1, "loaded_rows": 0}
    assert count(db, ServiceUsage) == 0
    assert count(db, UploadBatch) == 0


def test_reset_can_reload_the_sample_year(client: TestClient, db: Session, tools_enabled) -> None:
    upload_one_week(client, db)

    response = client.post("/testing/reset", json={"load_sample": True})
    assert response.status_code == 200
    assert response.json()["loaded_rows"] == 52
    assert count(db, ServiceUsage) == 52
    assert count(db, UploadBatch) == 1
