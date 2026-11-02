from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.demo_users import DEMO_USERS, ensure_demo_users
from app.models import Office, Role, StaffUser
from app.security import SESSION_COOKIE, create_session_token, read_session_token
from app.services.user_service import UserError, create_user
from tests.conftest import TEST_PASSWORD, make_user, sign_in


@pytest.fixture
def office(db: Session) -> Office:
    office = Office(name="Retriever Essentials")
    db.add(office)
    db.commit()
    return office


def test_login_sets_an_httponly_cookie_and_me_returns_the_user(
    client: TestClient, db: Session, office: Office
) -> None:
    make_user(db, "jdoe", "staff", office.id)

    response = sign_in(client, "JDoe ")  # usernames are trimmed and case-insensitive
    assert response.json() == {
        "id": 1,
        "username": "jdoe",
        "role": "staff",
        "office_id": office.id,
        "office": "Retriever Essentials",
        "is_active": True,
    }
    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"{SESSION_COOKIE}=")
    assert "HttpOnly" in cookie
    assert "Max-Age=28800" in cookie  # 8 hours
    assert "SameSite=lax" in cookie

    assert client.get("/auth/me").json()["username"] == "jdoe"


@pytest.mark.parametrize("username,password", [("admin", "wrong-password"), ("nobody", "x")])
def test_bad_credentials_get_the_same_message(
    client: TestClient, db: Session, username: str, password: str
) -> None:
    make_user(db, "admin", "admin")
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect username or password."}
    assert "set-cookie" not in response.headers


def test_me_requires_a_session(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
    client.cookies.set(SESSION_COOKIE, "not-a-token")
    assert client.get("/auth/me").status_code == 401


def test_logout_ends_the_session(client: TestClient, db: Session) -> None:
    make_user(db, "admin", "admin")
    sign_in(client, "admin")

    response = client.post("/auth/logout")
    assert response.status_code == 204
    assert f'{SESSION_COOKIE}=""' in response.headers["set-cookie"]
    assert client.get("/auth/me").status_code == 401


def test_deactivated_users_cannot_sign_in_and_lose_open_sessions(
    client: TestClient, db: Session
) -> None:
    user = make_user(db, "admin", "admin")
    sign_in(client, "admin")

    user.is_active = False
    db.commit()
    assert client.get("/auth/me").status_code == 401
    response = client.post("/auth/login", json={"username": "admin", "password": TEST_PASSWORD})
    assert response.status_code == 401


def test_bumping_the_session_version_signs_out_old_sessions(
    client: TestClient, db: Session
) -> None:
    user = make_user(db, "admin", "admin")
    sign_in(client, "admin")

    user.session_version += 1
    db.commit()
    assert client.get("/auth/me").status_code == 401


def test_tokens_must_be_signed_with_our_key_and_unexpired() -> None:
    settings = Settings(secret_key="test-key-that-is-long-enough-for-hs256")
    assert read_session_token(create_session_token(7, 2, settings), settings) == (7, 2)

    other = Settings(secret_key="another-key-that-is-long-enough-for-hs256")
    assert read_session_token(create_session_token(7, 2, other), settings) is None

    expired = jwt.encode(
        {"sub": "7", "ver": 2, "exp": datetime.now(UTC) - timedelta(seconds=1)},
        "test-key-that-is-long-enough-for-hs256",
        algorithm="HS256",
    )
    assert read_session_token(expired, settings) is None


def test_passwords_are_stored_hashed(db: Session) -> None:
    user = make_user(db, "admin", "admin")
    assert TEST_PASSWORD not in user.password_hash
    assert user.password_hash.startswith("$argon2")


@pytest.mark.parametrize(
    "username,password,role,office_id,message",
    [
        ("ab", "long-enough", Role.ADMIN, None, "3 to 50 characters"),
        ("has space", "long-enough", Role.ADMIN, None, "3 to 50 characters"),
        ("newuser", "short", Role.ADMIN, None, "at least 8 characters"),
        ("newuser", "long-enough", Role.STAFF, None, "must belong to an office"),
        ("newuser", "long-enough", Role.STAFF, 999, "Office 999 does not exist"),
        ("Taken", "long-enough", Role.ADMIN, None, "already taken"),
    ],
)
def test_account_rules(
    db: Session,
    username: str,
    password: str,
    role: Role,
    office_id: int | None,
    message: str,
) -> None:
    make_user(db, "taken", "leadership")
    with pytest.raises(UserError, match=message):
        create_user(db, username, password, role, office_id)


def test_only_staff_keep_an_office(db: Session, office: Office) -> None:
    user = create_user(db, "boss", "long-enough", Role.LEADERSHIP, office.id)
    assert user.office_id is None


def test_demo_accounts_are_created_and_restored(client: TestClient, db: Session) -> None:
    ensure_demo_users(db)
    for username, password, role in DEMO_USERS:
        assert sign_in(client, username, password).json()["role"] == role

    # Running it again undoes changes made during a demo.
    staff = db.scalar(select(StaffUser).where(StaffUser.username == "staff"))
    staff.is_active = False
    db.commit()
    ensure_demo_users(db)
    sign_in(client, "staff", "demo-staff-pass")
