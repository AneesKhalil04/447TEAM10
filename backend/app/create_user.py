"""Create a user account from the command line. Use it once to make the first admin.

    python -m app.create_user admin --role admin
    python -m app.create_user jdoe --role staff --office "Retriever Essentials"

Prompts for the password unless --password is given.
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Office, Role
from app.services.user_service import UserError, create_user


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create a user account.")
    parser.add_argument("username")
    parser.add_argument("--role", choices=[r.value for r in Role], required=True)
    parser.add_argument("--office", help="Office name; required for staff accounts")
    parser.add_argument("--password", help="Skip the prompt (avoid on shared machines)")
    args = parser.parse_args(argv)

    password = args.password or getpass.getpass("Password: ")
    with SessionLocal() as db:
        office_id = None
        if args.office:
            office_id = db.scalar(select(Office.id).where(Office.name == args.office))
            if office_id is None:
                print(f"No office named {args.office!r}. Run python -m app.seed first?")
                return 1
        try:
            user = create_user(db, args.username, password, Role(args.role), office_id)
        except UserError as error:
            print(error)
            return 1
    print(f"Created {user.role} account {user.username}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
