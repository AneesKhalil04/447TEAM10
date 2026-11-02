import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Office
from tests.conftest import TEST_PASSWORD, make_user, sign_in


@pytest.fixture
def office(db: Session) -> Office:
    office = Office(name="Retriever Essentials")
    db.add(office)
    db.commit()
    return office


@pytest.fixture
def admin(client: TestClient, db: Session):
    user = make_user(db, "admin", "admin")
    sign_in(client, "admin")
    return user


def test_admin_creates_and_lists_accounts(client: TestClient, admin, office: Office) -> None:
    response = client.post(
        "/users",
        json={
            "username": "JDoe",
            "password": "temp-pass-1",
            "role": "staff",
            "office_id": office.id,
        },
    )
    assert response.status_code == 201
    assert response.json()["username"] == "jdoe"
    assert response.json()["office"] == "Retriever Essentials"

    assert [u["username"] for u in client.get("/users").json()] == ["admin", "jdoe"]
    assert client.get("/offices").json() == [{"id": office.id, "name": "Retriever Essentials"}]

    sign_in(client, "jdoe", "temp-pass-1")


@pytest.mark.parametrize(
    "body,message",
    [
        ({"username": "x", "password": "long-enough", "role": "admin"}, "3 to 50 characters"),
        ({"username": "admin", "password": "long-enough", "role": "admin"}, "already taken"),
        ({"username": "jdoe", "password": "short", "role": "admin"}, "at least 8"),
        ({"username": "jdoe", "password": "long-enough", "role": "staff"}, "must belong"),
    ],
)
def test_account_rules_come_back_as_messages(client: TestClient, admin, body, message) -> None:
    response = client.post("/users", json=body)
    assert response.status_code == 422
    assert message in response.json()["detail"]


def test_resetting_a_password_signs_the_user_out(
    client: TestClient, db: Session, admin, office: Office
) -> None:
    user = make_user(db, "jdoe", "staff", office.id)
    other = TestClient(client.app)
    sign_in(other, "jdoe")

    response = client.patch(f"/users/{user.id}", json={"password": "new-password"})
    assert response.status_code == 200
    assert other.get("/auth/me").status_code == 401
    assert (
        other.post("/auth/login", json={"username": "jdoe", "password": TEST_PASSWORD}).status_code
        == 401
    )
    sign_in(other, "jdoe", "new-password")


def test_deactivating_and_reactivating(client: TestClient, db: Session, admin) -> None:
    user = make_user(db, "dean", "leadership")
    assert client.patch(f"/users/{user.id}", json={"is_active": False}).json()["is_active"] is False
    other = TestClient(client.app)
    assert (
        other.post("/auth/login", json={"username": "dean", "password": TEST_PASSWORD}).status_code
        == 401
    )

    assert client.patch(f"/users/{user.id}", json={"is_active": True}).status_code == 200
    sign_in(other, "dean")


def test_changing_roles_keeps_the_office_rule(
    client: TestClient, db: Session, admin, office: Office
) -> None:
    user = make_user(db, "dean", "leadership")
    response = client.patch(f"/users/{user.id}", json={"role": "staff"})
    assert response.status_code == 422
    assert "must belong to an office" in response.json()["detail"]

    response = client.patch(f"/users/{user.id}", json={"role": "staff", "office_id": office.id})
    assert response.json()["role"] == "staff"
    assert response.json()["office_id"] == office.id

    response = client.patch(f"/users/{user.id}", json={"role": "admin"})
    assert response.json()["office_id"] is None


def test_admins_cannot_lock_themselves_out(client: TestClient, admin) -> None:
    for body in ({"role": "staff"}, {"is_active": False}):
        response = client.patch(f"/users/{admin.id}", json=body)
        assert response.status_code == 422
        assert "your own admin access" in response.json()["detail"]
    assert client.patch(f"/users/{admin.id}", json={"password": "new-password"}).status_code == 200


def test_unknown_user(client: TestClient, admin) -> None:
    assert client.patch("/users/999", json={"is_active": False}).status_code == 404
