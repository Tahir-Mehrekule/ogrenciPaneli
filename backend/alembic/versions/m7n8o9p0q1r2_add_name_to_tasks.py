"""Add missing name column to tasks (fix for l6m7n8o9p0q1 omission)

l6m7n8o9p0q1, tasks tablosunu NEEDS_NAME listesine yanlışlıkla almadı.
BaseModel.name tüm tablolara name sütunu sağlar ve Task bunu override
etmediği için ORM `tasks.name` seçer; sütun olmadığında sorgular 500 atar.

Bu migration eksik `name` sütununu ve indeksini ekler. IF NOT EXISTS ile
idempotenttir: l6m7n8o9p0q1 düzeltildikten sonra sıfırdan kurulan DB'lerde
sütun zaten oluşmuş olabilir, bu durumda no-op çalışır.

Revision ID: m7n8o9p0q1r2
Revises: l6m7n8o9p0q1
Create Date: 2026-05-25 02:05:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "m7n8o9p0q1r2"
down_revision: Union[str, None] = "l6m7n8o9p0q1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS name VARCHAR(255)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tasks_name ON tasks (name)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_tasks_name")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS name")
