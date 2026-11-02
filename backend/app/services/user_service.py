"""Creating and changing staff accounts. Shared by the Users API and the setup command."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Office, Role, StaffUser
from app.security import MIN_PASSWORD_LENGTH, USERNAME_PATTERN, hash_password


class UserError(ValueError):
    """A request that breaks an account rule. The message is safe to show to the user."""


def normalize_username(username: str) -> str:
    username = username.strip().lower()
    if not USERNAME_PATTERN.fullmatch(username):
        raise UserError(
            "Usernames are 3 to 50 characters: lowercase letters, numbers, dots, dashes or "
            "underscores."
        )
    return username


def check_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise UserError(f"Passwords must be at least {MIN_PASSWORD_LENGTH} characters.")


def check_office(db: Session, role: Role, office_id: int | None) -> int | None:
    """The office to store for this role: required for staff, dropped for everyone else."""
    if role != Role.STAFF:
        return None
    if office_id is None:
        raise UserError("Staff accounts must belong to an office.")
    if db.get(Office, office_id) is None:
        raise UserError(f"Office {office_id} does not exist.")
    return office_id


def create_user(
    db: Session, username: str, password: str, role: Role, office_id: int | None = None
) -> StaffUser:
    username = normalize_username(username)
    check_password(password)
    office_id = check_office(db, role, office_id)
    if db.scalar(select(StaffUser.id).where(StaffUser.username == username)) is not None:
        raise UserError(f"The username {username} is already taken.")

    user = StaffUser(
        username=username, password_hash=hash_password(password), role=role, office_id=office_id
    )
    db.add(user)
    db.commit()
    return user


def update_user(
    db: Session,
    user: StaffUser,
    acting_admin: StaffUser,
    *,
    role: Role | None = None,
    office_id: int | None = None,
    is_active: bool | None = None,
    password: str | None = None,
) -> StaffUser:
    """Apply an admin's changes. Admins cannot lock themselves out by demoting or deactivating."""
    if user.id == acting_admin.id and (
        (role is not None and role != Role.ADMIN) or is_active is False
    ):
        raise UserError("You cannot remove your own admin access. Ask another admin.")

    # Validate everything before changing anything.
    if password is not None:
        check_password(password)
    new_role = role or user.role
    if role is not None or office_id is not None:
        new_office_id = check_office(db, new_role, office_id or user.office_id)
        user.role, user.office_id = new_role, new_office_id
    if password is not None:
        user.password_hash = hash_password(password)
        user.session_version += 1  # signs out sessions that used the old password
    if is_active is not None and is_active != user.is_active:
        user.is_active = is_active
        user.session_version += 1
    db.commit()
    return user
