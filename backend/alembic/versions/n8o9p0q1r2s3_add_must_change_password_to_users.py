"""Add must_change_password to users (bulk import forced reset)

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
Create Date: 2026-09-17 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "n8o9p0q1r2s3"
down_revision: Union[str, None] = "m7n8o9p0q1r2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users "
        "ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN "
        "NOT NULL DEFAULT FALSE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS must_change_password")
