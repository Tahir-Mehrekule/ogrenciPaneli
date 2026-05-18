"""B1+B2+B3: github_url, rejection_reason to projects; teacher_reviewed fields to reports

Revision ID: g1h2i3j4k5l6
Revises: e5f7g9i1j3k4
Create Date: 2026-05-17

Değişiklikler:
  B1 — projects.github_url VARCHAR(500) NULL
  B2 — projects.rejection_reason TEXT NULL
  B3 — reports.teacher_reviewed_at TIMESTAMP NULL
  B3 — reports.teacher_reviewed_by UUID NULL FK→users
"""

from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'e5f7g9i1j3k4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # B1: projects.github_url
    op.add_column(
        'projects',
        sa.Column('github_url', sa.String(500), nullable=True, comment='GitHub repo URL (opsiyonel)')
    )

    # B2: projects.rejection_reason
    op.add_column(
        'projects',
        sa.Column('rejection_reason', sa.Text(), nullable=True, comment='Reddetme sebebi (öğretmen notları)')
    )

    # B3: reports.teacher_reviewed_at
    op.add_column(
        'reports',
        sa.Column('teacher_reviewed_at', sa.DateTime(timezone=True), nullable=True, comment='Öğretmenin inceleme zamanı')
    )

    # B3: reports.teacher_reviewed_by
    op.add_column(
        'reports',
        sa.Column(
            'teacher_reviewed_by',
            UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
            comment='İnceleyen öğretmen'
        )
    )


def downgrade() -> None:
    op.drop_column('reports', 'teacher_reviewed_by')
    op.drop_column('reports', 'teacher_reviewed_at')
    op.drop_column('projects', 'rejection_reason')
    op.drop_column('projects', 'github_url')
