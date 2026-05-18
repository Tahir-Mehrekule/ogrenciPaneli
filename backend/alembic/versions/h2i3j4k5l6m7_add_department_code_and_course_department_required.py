"""Paket 5B: departments.code zorunlu + courses.department_id NOT NULL

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-05-17

Değişiklikler:
  1) departments.code VARCHAR(3) NOT NULL UNIQUE eklenir.
     Mevcut kayıtlar 001, 002, ... şeklinde backfill edilir (created_at sırasına göre).
  2) courses.department_id NOT NULL constraint'i uygulanır.
     NULL kayıt varsa "Belirtilmemiş" adlı seed bölüme bağlanır (code=999).
     ondelete: SET NULL → RESTRICT.
"""

from typing import Union
from alembic import op
import sqlalchemy as sa

revision = 'h2i3j4k5l6m7'
down_revision: Union[str, None] = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # ───────── 1) departments.code ─────────
    op.add_column(
        'departments',
        sa.Column('code', sa.String(3), nullable=True,
                  comment='3 haneli bölüm kodu — unique (örn: 235)')
    )

    # Mevcut bölümlere kod backfill: created_at sırasına göre 001, 002, ...
    bind.execute(sa.text("""
        WITH ordered AS (
            SELECT id,
                   LPAD(ROW_NUMBER() OVER (ORDER BY created_at, id)::text, 3, '0') AS new_code
            FROM departments
            WHERE is_deleted = FALSE
        )
        UPDATE departments d
        SET code = ordered.new_code
        FROM ordered
        WHERE d.id = ordered.id
    """))

    # Soft-deleted kayıtlar için de kod ata (constraint NULL kaldırırken patlamamak için)
    bind.execute(sa.text("""
        UPDATE departments
        SET code = LPAD((900 + (random() * 99)::int)::text, 3, '0')
        WHERE code IS NULL
    """))

    op.alter_column('departments', 'code', nullable=False)
    op.create_unique_constraint('uq_departments_code', 'departments', ['code'])
    op.create_index('ix_departments_code', 'departments', ['code'])

    # ───────── 2) courses.department_id NOT NULL ─────────
    # NULL kayıtlar varsa "Belirtilmemiş" bölümüne migrate
    null_count = bind.execute(sa.text(
        "SELECT COUNT(*) FROM courses WHERE department_id IS NULL"
    )).scalar()

    if null_count and null_count > 0:
        # "Belirtilmemiş" bölümünü oluştur (yoksa) ve NULL kayıtları ona bağla
        bind.execute(sa.text("""
            INSERT INTO departments (id, name, code, is_active, is_deleted, created_at, updated_at)
            SELECT gen_random_uuid(), 'Belirtilmemiş', '999', TRUE, FALSE, NOW(), NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM departments WHERE name = 'Belirtilmemiş'
            )
        """))
        bind.execute(sa.text("""
            UPDATE courses
            SET department_id = (SELECT id FROM departments WHERE name = 'Belirtilmemiş' LIMIT 1)
            WHERE department_id IS NULL
        """))

    # FK constraint'i RESTRICT olarak değiştir
    op.drop_constraint('courses_department_id_fkey', 'courses', type_='foreignkey')
    op.alter_column('courses', 'department_id', nullable=False)
    op.create_foreign_key(
        'courses_department_id_fkey', 'courses', 'departments',
        ['department_id'], ['id'], ondelete='RESTRICT'
    )


def downgrade() -> None:
    # courses.department_id geri NULL ve SET NULL
    op.drop_constraint('courses_department_id_fkey', 'courses', type_='foreignkey')
    op.alter_column('courses', 'department_id', nullable=True)
    op.create_foreign_key(
        'courses_department_id_fkey', 'courses', 'departments',
        ['department_id'], ['id'], ondelete='SET NULL'
    )

    # departments.code geri al
    op.drop_index('ix_departments_code', table_name='departments')
    op.drop_constraint('uq_departments_code', 'departments', type_='unique')
    op.drop_column('departments', 'code')
