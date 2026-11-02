from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (registers every table on Base.metadata)
from app.db import Base, get_db
from app.main import app
from app.models import Role
from app.services.user_service import create_user


def _enable_sqlite_foreign_keys(dbapi_connection, _record) -> None:
    dbapi_connection.execute("PRAGMA foreign_keys=ON")


@pytest.fixture
def engine() -> Iterator[Engine]:
    # StaticPool shares one in-memory database across threads (TestClient uses another thread).
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    event.listen(engine, "connect", _enable_sqlite_foreign_keys)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session_factory(engine: Engine) -> sessionmaker[Session]:
    # Same options as app.db.SessionLocal, so tests catch autoflush-dependent bugs.
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


TEST_PASSWORD = "correct-horse"


def make_user(db: Session, username: str, role: str, office_id: int | None = None):
    """Create an account with TEST_PASSWORD."""
    return create_user(db, username, TEST_PASSWORD, Role(role), office_id)


def sign_in(client: TestClient, username: str, password: str = TEST_PASSWORD):
    """Log in; the TestClient keeps the session cookie for later requests."""
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return response
