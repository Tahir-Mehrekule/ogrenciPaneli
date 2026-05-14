"""add composite indexes for performance

Revision ID: d4e6f8h0i2j3
Revises: c3d5e7g9h0i2
Create Date: 2026-05-13

Değişiklikler (DB-3):
1. reports(project_id, submitted_by, week_number, year) — duplicate check sorgusu
2. project_members(project_id, status) — pending liste sorgusu
3. users(is_deleted, is_active) — soft-delete filtresi yoğun tabloda
4. tasks(project_id, status) — proje bazlı görev filtreleme
5. tasks(assigned_to, status) — kullanıcı bazlı görev filtreleme
6. notifications(user_id, is_read) — okunmamış bildirim sayısı sorgusu
"""

from alembic import op


# revision identifiers
revision = 'd4e6f8h0i2j3'
down_revision = 'c3d5e7g9h0i2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Report duplicate check — (project_id, submitted_by, week_number, year)
    #    uq_report_weekly constraint zaten var, bu sorguyu cover eder ama
    #    ayrı index lookup için explicit index daha hızlı.
    op.create_index(
        'ix_reports_project_user_week',
        'reports',
        ['project_id', 'submitted_by', 'week_number', 'year'],
    )

    # 2. ProjectMember pending list — (project_id, status)
    op.create_index(
        'ix_project_members_project_status',
        'project_members',
        ['project_id', 'status'],
    )

    # 3. User soft-delete filtresi — (is_deleted, is_active)
    op.create_index(
        'ix_users_deleted_active',
        'users',
        ['is_deleted', 'is_active'],
    )

    # 4. Task proje bazlı filtreleme — (project_id, status)
    op.create_index(
        'ix_tasks_project_status',
        'tasks',
        ['project_id', 'status'],
    )

    # 5. Task kullanıcı bazlı filtreleme — (assigned_to, status)
    op.create_index(
        'ix_tasks_assigned_status',
        'tasks',
        ['assigned_to', 'status'],
    )

    # 6. Notification okunmamış sayısı — (user_id, is_read)
    op.create_index(
        'ix_notifications_user_read',
        'notifications',
        ['user_id', 'is_read'],
    )


def downgrade() -> None:
    op.drop_index('ix_notifications_user_read', table_name='notifications')
    op.drop_index('ix_tasks_assigned_status', table_name='tasks')
    op.drop_index('ix_tasks_project_status', table_name='tasks')
    op.drop_index('ix_users_deleted_active', table_name='users')
    op.drop_index('ix_project_members_project_status', table_name='project_members')
    op.drop_index('ix_reports_project_user_week', table_name='reports')
