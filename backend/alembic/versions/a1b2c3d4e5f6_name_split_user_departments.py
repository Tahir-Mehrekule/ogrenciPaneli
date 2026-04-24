"""name split + user_departments table

Revision ID: a1b2c3d4e5f6
Revises: f1e2d3c4b5a6
Create Date: 2026-04-12

Değişiklikler:
  M1 — users: name → first_name + last_name (veri taşıma dahil)
  M2 — users: department string kaldırıldı
  M3 — user_departments: yeni ilişki tablosu (users ↔ departments çoka-çok)
       Mevcut users.department string'leri departments tablosuna eşlenerek taşınır.
"""

from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f1e2d3c4b5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── M1: users tablosuna first_name + last_name ekle (önce nullable) ───────
    op.add_column('users', sa.Column('first_name', sa.String(100), nullable=True, comment='Ad'))
    op.add_column('users', sa.Column('last_name', sa.String(100), nullable=True, comment='Soyad'))

    # Veri taşıma: name → first_name + last_name
    # Kural: son boşluk öncesi = first_name, son kelime = last_name
    # Tek kelimeli isim: first_name = last_name = name (boş soyad olmasın)
    op.execute("""
        UPDATE users
        SET
            first_name = CASE
                WHEN name ~ '\\s'
                THEN TRIM(regexp_replace(name, '\\s+\\S+$', ''))
                ELSE name
            END,
            last_name = CASE
                WHEN name ~ '\\s'
                THEN TRIM(regexp_replace(name, '^.*\\s+', ''))
                ELSE name
            END
        WHERE name IS NOT NULL
    """)

    # Veri taşıması tamamlandı — NOT NULL yap
    op.alter_column('users', 'first_name', nullable=False)
    op.alter_column('users', 'last_name', nullable=False)

    # name sütununu sil
    op.drop_column('users', 'name')

    # ── M2: user_departments tablosu oluştur ─────────────────────────────────
    op.create_table(
        'user_departments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False,
                  server_default=sa.text('gen_random_uuid()'), comment='Primary key'),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, comment='FK → users'),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=False, comment='FK → departments'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'department_id', name='uq_user_department'),
    )
    op.create_index('ix_user_departments_user_id', 'user_departments', ['user_id'])
    op.create_index('ix_user_departments_department_id', 'user_departments', ['department_id'])

    # Veri taşıma: users.department string → user_departments (departments.name ile eşleştir)
    op.execute("""
        INSERT INTO user_departments (id, user_id, department_id, created_at, updated_at, is_active)
        SELECT
            gen_random_uuid(),
            u.id,
            d.id,
            NOW(),
            NOW(),
            TRUE
        FROM users u
        JOIN departments d
            ON LOWER(TRIM(d.name)) = LOWER(TRIM(u.department))
        WHERE u.department IS NOT NULL
          AND u.department != ''
          AND d.is_active = TRUE
    """)

    # ── M3: users.department sütununu sil ────────────────────────────────────
    op.drop_column('users', 'department')


def downgrade() -> None:
    # Geri alma: user_departments kaldır, department string + name geri ekle

    op.add_column('users', sa.Column('department', sa.String(200), nullable=True))
    op.add_column('users', sa.Column('name', sa.String(150), nullable=True))

    # Veri geri taşıma: first_name + last_name → name
    op.execute("""
        UPDATE users
        SET name = TRIM(first_name || ' ' || last_name)
    """)

    # department geri taşıma: user_departments'tan ilk bölümü al
    op.execute("""
        UPDATE users u
        SET department = (
            SELECT d.name
            FROM user_departments ud
            JOIN departments d ON d.id = ud.department_id
            WHERE ud.user_id = u.id
              AND ud.is_active = TRUE
            ORDER BY ud.created_at ASC
            LIMIT 1
        )
    """)

    op.drop_index('ix_user_departments_department_id', table_name='user_departments')
    op.drop_index('ix_user_departments_user_id', table_name='user_departments')
    op.drop_table('user_departments')

    op.drop_column('users', 'first_name')
    op.drop_column('users', 'last_name')
