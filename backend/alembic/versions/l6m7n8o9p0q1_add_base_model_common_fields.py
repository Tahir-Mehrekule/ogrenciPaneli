"""Add BaseModel common fields (name, short_name, description, tags)

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-05-18 09:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "l6m7n8o9p0q1"
down_revision: Union[str, None] = "k5l6m7n8o9p0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tablolar ve eksik sütunlar.
# courses/departments/project_categories zaten name'e sahip.
# projects/tasks zaten description'a sahip.
NEEDS_NAME = [
    "activity_logs", "class_sections", "course_enrollments", "files",
    "notifications", "project_members", "projects", "reports",
    "student_year_prefixes", "user_departments", "users",
]
NEEDS_SHORT_NAME = [
    "activity_logs", "class_sections", "course_enrollments", "courses",
    "departments", "files", "notifications", "project_categories",
    "project_members", "projects", "reports", "student_year_prefixes",
    "tasks", "user_departments", "users",
]
NEEDS_DESCRIPTION = [
    "activity_logs", "class_sections", "course_enrollments", "courses",
    "departments", "files", "notifications", "project_categories",
    "project_members", "reports", "student_year_prefixes",
    "user_departments", "users",
]
NEEDS_TAGS = [
    "activity_logs", "class_sections", "course_enrollments", "courses",
    "departments", "files", "notifications", "project_categories",
    "project_members", "projects", "reports", "student_year_prefixes",
    "tasks", "user_departments", "users",
]


def upgrade() -> None:
    for tbl in NEEDS_NAME:
        op.add_column(tbl, sa.Column("name", sa.String(255), nullable=True))
        op.create_index(f"ix_{tbl}_name", tbl, ["name"])

    for tbl in NEEDS_SHORT_NAME:
        op.add_column(tbl, sa.Column("short_name", sa.String(100), nullable=True))
        op.create_index(f"ix_{tbl}_short_name", tbl, ["short_name"])

    for tbl in NEEDS_DESCRIPTION:
        op.add_column(tbl, sa.Column("description", sa.Text(), nullable=True))

    for tbl in NEEDS_TAGS:
        op.add_column(tbl, sa.Column("tags", JSONB(), nullable=True))


def downgrade() -> None:
    for tbl in NEEDS_TAGS:
        op.drop_column(tbl, "tags")

    for tbl in NEEDS_DESCRIPTION:
        op.drop_column(tbl, "description")

    for tbl in NEEDS_SHORT_NAME:
        op.drop_index(f"ix_{tbl}_short_name", table_name=tbl)
        op.drop_column(tbl, "short_name")

    for tbl in NEEDS_NAME:
        op.drop_index(f"ix_{tbl}_name", table_name=tbl)
        op.drop_column(tbl, "name")
