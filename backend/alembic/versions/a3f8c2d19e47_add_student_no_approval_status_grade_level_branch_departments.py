"""add student_no, approval_status, grade_level, branch, departments

Revision ID: a3f8c2d19e47
Revises: 1800d5eb63df
Create Date: 2026-04-11 00:00:00.000000

Değişiklikler:
1. users tablosu:
   - student_no (String 9, nullable, unique) — öğrenci numarası
   - approval_status (Enum: pending/approved/rejected, server_default='approved') — hesap onay durumu

2. courses tablosu:
   - grade_level (String 50, nullable) — sınıf/yıl bilgisi
   - branch (String 50, nullable) — şube bilgisi

3. departments tablosu (yeni):
   - Dinamik bölüm yönetimi için admin paneli tablosu
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'a3f8c2d19e47'
down_revision: Union[str, None] = 'cdfad51fb42f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. PostgreSQL'de approval_status enum tipini oluştur
    approval_status_enum = sa.Enum(
        'pending', 'approved', 'rejected',
        name='approval_status'
    )
    approval_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. users tablosuna student_no ekle
    op.add_column(
        'users',
        sa.Column(
            'student_no',
            sa.String(length=9),
            nullable=True,
            comment="9 haneli öğrenci numarası (sadece STUDENT rolü için, teacher/admin null)"
        )
    )
    op.create_index(
        op.f('ix_users_student_no'),
        'users',
        ['student_no'],
        unique=True
    )

    # 3. users tablosuna approval_status ekle
    # server_default='approved' → mevcut tüm kayıtlar otomatik APPROVED olur, giriş erişimleri korunur
    op.add_column(
        'users',
        sa.Column(
            'approval_status',
            approval_status_enum,
            nullable=False,
            server_default='approved',
            comment="Hesap onay durumu: pending (yeni öğrenci), approved, rejected"
        )
    )
    op.create_index(
        op.f('ix_users_approval_status'),
        'users',
        ['approval_status'],
        unique=False
    )

    # 4. courses tablosuna grade_level ekle
    op.add_column(
        'courses',
        sa.Column(
            'grade_level',
            sa.String(length=50),
            nullable=True,
            comment="Sınıf/yıl bilgisi (örn: '2. Sınıf')"
        )
    )

    # 5. courses tablosuna branch ekle
    op.add_column(
        'courses',
        sa.Column(
            'branch',
            sa.String(length=50),
            nullable=True,
            comment="Şube bilgisi (örn: 'A Şubesi')"
        )
    )

    # 6. departments tablosunu oluştur
    op.create_table(
        'departments',
        sa.Column(
            'name',
            sa.String(length=200),
            nullable=False,
            comment='Bölüm adı — unique (örn: Bilgisayar Mühendisliği)'
        ),
        sa.Column(
            'id',
            sa.UUID(),
            nullable=False,
            comment='Benzersiz kayıt kimliği (UUID)'
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            comment='Kayıt oluşturma tarihi'
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=False,
            comment='Son güncelleme tarihi'
        ),
        sa.Column(
            'is_active',
            sa.Boolean(),
            nullable=False,
            comment='Soft delete: True=aktif, False=silinmiş'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_departments_name'),
    )
    op.create_index(op.f('ix_departments_id'), 'departments', ['id'], unique=False)
    op.create_index(op.f('ix_departments_is_active'), 'departments', ['is_active'], unique=False)
    op.create_index(op.f('ix_departments_name'), 'departments', ['name'], unique=True)


def downgrade() -> None:
    # departments tablosunu kaldır
    op.drop_index(op.f('ix_departments_name'), table_name='departments')
    op.drop_index(op.f('ix_departments_is_active'), table_name='departments')
    op.drop_index(op.f('ix_departments_id'), table_name='departments')
    op.drop_table('departments')

    # courses kolonlarını kaldır
    op.drop_column('courses', 'branch')
    op.drop_column('courses', 'grade_level')

    # users kolonlarını kaldır
    op.drop_index(op.f('ix_users_approval_status'), table_name='users')
    op.drop_column('users', 'approval_status')
    op.drop_index(op.f('ix_users_student_no'), table_name='users')
    op.drop_column('users', 'student_no')

    # approval_status enum tipini kaldır
    sa.Enum(name='approval_status').drop(op.get_bind(), checkfirst=True)
