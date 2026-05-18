"""Paket 3: class_sections tablosu + users.class_section_id FK

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-05-17

Değişiklikler:
  1) class_sections tablosu oluşturulur:
     id, department_id (FK→departments RESTRICT), grade_label, branch_code,
     capacity, BaseModel alanları.
     Composite unique: (department_id, grade_label, branch_code).
  2) users.class_section_id UUID NULL FK → class_sections (SET NULL).
"""

from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'i3j4k5l6m7n8'
down_revision: Union[str, None] = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) class_sections tablosu
    op.create_table(
        'class_sections',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('department_id', UUID(as_uuid=True),
                  sa.ForeignKey('departments.id', ondelete='RESTRICT'),
                  nullable=False, index=True),
        sa.Column('grade_label', sa.String(50), nullable=False, index=True,
                  comment="Sınıf etiketi (örn: '2. Sınıf')"),
        sa.Column('branch_code', sa.String(10), nullable=False,
                  comment="Şube kodu (örn: 'A')"),
        sa.Column('capacity', sa.Integer(), nullable=True,
                  comment='Kontenjan (opsiyonel)'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.UniqueConstraint('department_id', 'grade_label', 'branch_code',
                            name='uq_class_section_dept_grade_branch'),
    )

    # 2) users.class_section_id
    op.add_column(
        'users',
        sa.Column('class_section_id', UUID(as_uuid=True),
                  sa.ForeignKey('class_sections.id', ondelete='SET NULL'),
                  nullable=True,
                  comment='Atanmış şube (opsiyonel)')
    )
    op.create_index('ix_users_class_section_id', 'users', ['class_section_id'])


def downgrade() -> None:
    op.drop_index('ix_users_class_section_id', table_name='users')
    op.drop_column('users', 'class_section_id')
    op.drop_table('class_sections')
