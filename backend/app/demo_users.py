"""Create one account per role with known passwords, for local demos. Safe to run repeatedly.

    python -m app.demo_users

Refuses to run unless ENABLE_TEST_TOOLS is on, so these passwords never exist on a real
deployment. Existing demo accounts are reactivated and get their demo password back.
"""

import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import Role, StaffUser
from app.security import hash_password
from app.seed import seed
from app.services.user_service import create_user

# username, password, role (staff accounts belong to the pilot office)
DEMO_USERS = [
    ("admin", "demo-admin-pass", Role.ADMIN),
    ("staff", "demo-staff-pass", Role.STAFF),
    ("dean", "demo-dean-pass", Role.LEADERSHIP),
]


def ensure_demo_users(db: Session) -> list[str]:
    office_id = seed(db).office_id
    names = []
    for username, password, role in DEMO_USERS:
        user = db.scalar(select(StaffUser).where(StaffUser.username == username))
        if user is None:
            create_user(db, username, password, role, office_id)
        else:
            user.password_hash = hash_password(password)
            user.role = role
            user.office_id = office_id if role == Role.STAFF else None
            user.is_active = True
            user.session_version += 1
            db.commit()
        names.append(f"{username} / {password} ({role})")
    return names


def main() -> int:
    if not get_settings().enable_test_tools:
        print("Demo accounts are only for local demos. Set ENABLE_TEST_TOOLS=true to create them.")
        return 1
    with SessionLocal() as db:
        for line in ensure_demo_users(db):
            print(f"Demo account: {line}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
