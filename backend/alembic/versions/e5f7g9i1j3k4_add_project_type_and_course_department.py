"""add project_type enum and course.department_id

Revision ID: e5f7g9i1j3k4
Revises: d4e6f8h0i2j3
Create Date: 2026-05-13

Değişiklikler:
- project_type enum tipi oluştur (individual, team, both)
- courses.department_id alanı ekle (FK → departments.id)
- courses.project_type alanı ekle (default: both)
- projects.project_type alanı ekle (nullable)
- course_enrollments tablosunu kaldır (enrollment sistemi kaldırıldı)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'e5f7g9i1j3k4'
down_revision = 'd4e6f8h0i2j3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. project_type enum tipi oluştur
    project_type_enum = postgresql.ENUM(
        'individual', 'team', 'both',
        name='project_type',
        create_type=False
    )
    project_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. courses tablosuna department_id ekle
    op.add_column(
        'courses',
        sa.Column(
            'department_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('departments.id', ondelete='SET NULL'),
            nullable=True,
            comment="Dersin bölümü — öğrenciler bölüm eşleşmesi ile otomatik görür"
        )
    )
    op.create_index('ix_courses_department_id', 'courses', ['department_id'])

    # 3. courses tablosuna project_type ekle
    op.add_column(
        'courses',
        sa.Column(
            'project_type',
            sa.Enum('individual', 'team', 'both', name='project_type', create_type=False),
            nullable=False,
            server_default='both',
            comment="Bu derse açılabilecek proje tipi"
        )
    )

    # 4. projects tablosuna project_type ekle
    op.add_column(
        'projects',
        sa.Column(
            'project_type',
            sa.Enum('individual', 'team', 'both', name='project_type', create_type=False),
            nullable=True,
            comment="Bireysel mi ekip mi? Ders ayarından miras alınır"
        )
    )

    # 5. course_enrollments tablosunu kaldır
    op.drop_table('course_enrollments')


def downgrade() -> None:
    # course_enrollments geri yükle
    op.create_table(
        'course_enrollments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_id', 'student_id', name='uq_course_student'),
    )

    op.drop_column('projects', 'project_type')
    op.drop_index('ix_courses_department_id', 'courses')
    op.drop_column('courses', 'department_id')
    op.drop_column('courses', 'project_type')

    op.execute("DROP TYPE IF EXISTS project_type")
