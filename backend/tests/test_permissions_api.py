import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.main import app
from app.models import DataSource, Office
from app.seed import seed
from tests.conftest import make_user, sign_in

HEADER = "week_start,visits,students_served,pounds_distributed"


@pytest.fixture
def sources(db: Session) -> tuple[DataSource, DataSource]:
    """The pilot office's data source and one for a second office."""
    pilot = seed(db)
    other = DataSource(office=Office(name="Emergency Aid Program"), name="Weekly")
    db.add(other)
    db.commit()
    return pilot, other


@pytest.fixture
def tools_enabled():
    app.dependency_overrides[get_settings] = lambda: Settings(enable_test_tools=True)
    yield
    app.dependency_overrides.pop(get_settings, None)


def upload(client: TestClient, source: DataSource, rows: str, replace: bool = False):
    return client.post(
        "/uploads",
        data={"data_source_id": str(source.id), "replace": str(replace).lower()},
        files={"file": ("week.csv", f"{HEADER}\n{rows}\n".encode(), "text/csv")},
    )


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/dashboard/summary"),
        ("get", "/data-sources"),
        ("get", "/offices"),
        ("get", "/uploads"),
        ("get", "/uploads/template"),
        ("post", "/uploads"),
        ("get", "/testing"),
        ("post", "/testing/reset"),
        ("get", "/users"),
        ("post", "/users"),
        ("patch", "/users/1"),
        ("get", "/audit-log"),
    ],
)
def test_every_endpoint_except_health_needs_a_login(
    client: TestClient, method: str, path: str
) -> None:
    assert getattr(client, method)(path).status_code == 401
    assert client.get("/health").status_code == 200


def test_leadership_can_view_but_not_change_anything(
    client: TestClient, db: Session, sources, tools_enabled
) -> None:
    pilot, _ = sources
    make_user(db, "dean", "leadership")
    sign_in(client, "dean")

    for path in ["/dashboard/summary", "/data-sources", "/uploads", "/uploads/template"]:
        assert client.get(path).status_code == 200, path
    assert upload(client, pilot, "2025-10-13,1,1,1").status_code == 403
    assert client.get("/testing").json() == {"enabled": False}
    assert client.post("/testing/reset", json={"load_sample": False}).status_code == 403
    assert client.get("/users").status_code == 403
    assert client.get("/audit-log").status_code == 403


def test_staff_upload_only_for_their_own_office(
    client: TestClient, db: Session, sources, tools_enabled
) -> None:
    pilot, other = sources
    make_user(db, "jdoe", "staff", pilot.office_id)
    sign_in(client, "jdoe")

    assert [s["id"] for s in client.get("/data-sources").json()] == [pilot.id]
    assert upload(client, pilot, "2025-10-13,1,1,1").status_code == 201
    response = upload(client, other, "2025-10-13,1,1,1")
    assert response.status_code == 403
    assert response.json()["message"] == "You can only upload data for your own office."

    assert client.get("/testing").json() == {"enabled": False}
    assert client.get("/users").status_code == 403
    assert client.get("/audit-log").status_code == 403


def test_admins_see_the_testing_tab_only_when_tools_are_on(
    client: TestClient, db: Session, tools_enabled
) -> None:
    make_user(db, "admin", "admin")
    sign_in(client, "admin")
    assert client.get("/testing").json() == {"enabled": True}


def test_uploads_and_replacements_are_audited(
    client: TestClient, db: Session, sources, tools_enabled
) -> None:
    pilot, _ = sources
    make_user(db, "jdoe", "staff", pilot.office_id)
    make_user(db, "admin", "admin")

    sign_in(client, "jdoe")
    assert upload(client, pilot, "2025-10-13,1,1,1\n2025-10-20,2,2,2").status_code == 201
    assert client.get("/uploads").json()[0]["uploaded_by"] == "jdoe"

    sign_in(client, "admin")
    assert upload(client, pilot, "2025-10-20,3,3,3", replace=True).status_code == 201

    replace, first = client.get("/audit-log").json()
    assert first["username"] == "jdoe"
    assert first["action"] == "upload"
    assert first["office"] == "Retriever Essentials"
    assert first["details"] == {"rows": 2, "first_week": "2025-10-13", "last_week": "2025-10-20"}
    assert replace["username"] == "admin"
    assert replace["action"] == "replace"
    assert replace["details"]["replaced_rows"] == 1
    assert replace["details"]["replaced_files"] == ["week.csv"]

    # The log outlives the uploads it describes.
    assert client.post("/testing/reset", json={"load_sample": False}).status_code == 200
    entries = client.get("/audit-log").json()
    assert len(entries) == 2
    assert all(entry["upload_batch_id"] is None for entry in entries)


def test_failed_uploads_are_not_audited(client: TestClient, db: Session, sources) -> None:
    pilot, _ = sources
    make_user(db, "admin", "admin")
    sign_in(client, "admin")
    assert upload(client, pilot, "not-a-date,1,1,1").status_code == 422
    assert client.get("/audit-log").json() == []
