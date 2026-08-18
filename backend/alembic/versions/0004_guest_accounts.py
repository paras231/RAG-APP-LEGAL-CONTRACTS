"""guest accounts: nullable email/password, is_guest flag

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "email", existing_type=sa.String(), nullable=True)
    op.alter_column("users", "hashed_password", existing_type=sa.String(), nullable=True)
    op.add_column(
        "users",
        sa.Column("is_guest", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "is_guest")
    op.alter_column("users", "hashed_password", existing_type=sa.String(), nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(), nullable=False)
