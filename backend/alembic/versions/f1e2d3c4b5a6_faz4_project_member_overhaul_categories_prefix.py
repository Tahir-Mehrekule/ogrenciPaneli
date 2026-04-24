"""faz4: project_member overhaul, project_categories, student_year_prefixes, archive, share_code

Revision ID: f1e2d3c4b5a6
Revises: a3f8c2d19e47
Create Date: 2026-04-12

Değişiklikler:
  M1 — projects: share_code, category_id, is_archived, archived_by, archived_at
  M2 — project_members: role (MANAGER/MEMBER) + status (ACTIVE/INVITED/JOIN_REQUESTED/REJECTED) overhaul
  M3 — project_categories: yeni tablo
  M4 — student_year_prefixes: yeni tablo
  M5 — users: entry_year, grade_label
"""

from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f1e2d3c4b5a6'
down_revision: Union[str, None] = 'a3f8c2d19e47'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Yeni enum tipleri ──────────────────────────────────────────────────────
    member_role_enum = postgresql.ENUM(
        'MANAGER', 'MEMBER',
        name='member_role',
        create_type=True
    )
    member_status_enum = postgresql.ENUM(
        'ACTIVE', 'INVITED', 'JOIN_REQUESTED', 'REJECTED',
        name='member_status',
        create_type=True
    )
    member_role_enum.create(op.get_bind(), checkfirst=True)
    member_status_enum.create(op.get_bind(), checkfirst=True)

    # ── M3: project_categories tablosu ────────────────────────────────────────
    op.create_table(
        'project_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_id', 'name', name='uq_category_course_name'),
    )
    op.create_index('ix_project_categories_course_id', 'project_categories', ['course_id'])

    # ── M4: student_year_prefixes tablosu ─────────────────────────────────────
    op.create_table(
        'student_year_prefixes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('prefix', sa.String(6), nullable=False),
        sa.Column('entry_year', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(50), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('prefix', name='uq_student_prefix'),
    )
    op.create_index('ix_student_year_prefixes_prefix', 'student_year_prefixes', ['prefix'])

    # ── M1: projects tablosu — yeni kolonlar ──────────────────────────────────
    op.add_column('projects', sa.Column('share_code', sa.String(8), nullable=True))
    op.add_column('projects', sa.Column(
        'category_id', postgresql.UUID(as_uuid=True), nullable=True
    ))
    op.add_column('projects', sa.Column(
        'is_archived', sa.Boolean(), nullable=False, server_default='false'
    ))
    op.add_column('projects', sa.Column(
        'archived_by', postgresql.UUID(as_uuid=True), nullable=True
    ))
    op.add_column('projects', sa.Column(
        'archived_at', sa.DateTime(timezone=True), nullable=True
    ))

    op.create_unique_constraint('uq_project_share_code', 'projects', ['share_code'])
    op.create_index('ix_projects_share_code', 'projects', ['share_code'])
    op.create_index('ix_projects_category_id', 'projects', ['category_id'])

    op.create_foreign_key(
        'fk_projects_category_id', 'projects',
        'project_categories', ['category_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_projects_archived_by', 'projects',
        'users', ['archived_by'], ['id'],
        ondelete='SET NULL'
    )

    # ── M2: project_members overhaul ──────────────────────────────────────────
    # Eski 'role' kolonu String(50) → yeni enum kolonu olacak; önce eski silinir
    op.drop_column('project_members', 'role')

    op.add_column('project_members', sa.Column(
        'role',
        sa.Enum('MANAGER', 'MEMBER', name='member_role', create_type=False),
        nullable=False,
        server_default='MEMBER'
    ))
    op.add_column('project_members', sa.Column(
        'status',
        sa.Enum('ACTIVE', 'INVITED', 'JOIN_REQUESTED', 'REJECTED', name='member_status', create_type=False),
        nullable=False,
        server_default='ACTIVE'
    ))
    op.add_column('project_members', sa.Column(
        'invited_by', postgresql.UUID(as_uuid=True), nullable=True
    ))
    op.add_column('project_members', sa.Column(
        'responded_at', sa.DateTime(timezone=True), nullable=True
    ))
    op.add_column('project_members', sa.Column(
        'joined_at', sa.DateTime(timezone=True), nullable=True
    ))

    op.create_foreign_key(
        'fk_project_members_invited_by', 'project_members',
        'users', ['invited_by'], ['id'],
        ondelete='SET NULL'
    )

    # Proje oluşturucularını MANAGER yap
    op.execute("""
        UPDATE project_members pm
        SET role = 'MANAGER'
        FROM projects p
        WHERE pm.project_id = p.id
          AND pm.user_id = p.created_by
          AND pm.status = 'ACTIVE'
    """)

    # Mevcut üyelere joined_at = created_at set et
    op.execute("""
        UPDATE project_members
        SET joined_at = created_at
        WHERE status = 'ACTIVE' AND joined_at IS NULL
    """)

    # ── M5: users — entry_year, grade_label ───────────────────────────────────
    op.add_column('users', sa.Column('entry_year', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('grade_label', sa.String(50), nullable=True))


def downgrade() -> None:
    # users
    op.drop_column('users', 'grade_label')
    op.drop_column('users', 'entry_year')

    # project_members — geri al
    op.drop_constraint('fk_project_members_invited_by', 'project_members', type_='foreignkey')
    op.drop_column('project_members', 'joined_at')
    op.drop_column('project_members', 'responded_at')
    op.drop_column('project_members', 'invited_by')
    op.drop_column('project_members', 'status')
    op.drop_column('project_members', 'role')
    # Eski string role kolonunu geri ekle
    op.add_column('project_members', sa.Column('role', sa.String(50), nullable=False, server_default='member'))

    # projects
    op.drop_constraint('fk_projects_archived_by', 'projects', type_='foreignkey')
    op.drop_constraint('fk_projects_category_id', 'projects', type_='foreignkey')
    op.drop_index('ix_projects_category_id', table_name='projects')
    op.drop_index('ix_projects_share_code', table_name='projects')
    op.drop_constraint('uq_project_share_code', 'projects', type_='unique')
    op.drop_column('projects', 'archived_at')
    op.drop_column('projects', 'archived_by')
    op.drop_column('projects', 'is_archived')
    op.drop_column('projects', 'category_id')
    op.drop_column('projects', 'share_code')

    # student_year_prefixes
    op.drop_index('ix_student_year_prefixes_prefix', table_name='student_year_prefixes')
    op.drop_table('student_year_prefixes')

    # project_categories
    op.drop_index('ix_project_categories_course_id', table_name='project_categories')
    op.drop_table('project_categories')

    # enum tipleri
    op.execute("DROP TYPE IF EXISTS member_status")
    op.execute("DROP TYPE IF EXISTS member_role")
