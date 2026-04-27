"""
ProjectCategory repository modülü.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.project_category.project_category_model import ProjectCategory
from app.features.project.project_model import Project


class ProjectCategoryRepo(BaseRepository[ProjectCategory]):

    def __init__(self, db: Session):
        super().__init__(ProjectCategory, db)

    def get_by_course(self, course_id: UUID) -> list[ProjectCategory]:
        return (
            self.db.query(ProjectCategory)
            .filter(ProjectCategory.course_id == course_id)
            .filter(ProjectCategory.is_active == True)
            .filter(ProjectCategory.is_deleted == False)
            .order_by(ProjectCategory.name)
            .all()
        )

    def name_exists(self, course_id: UUID, name: str, exclude_id: UUID | None = None) -> bool:
        q = (
            self.db.query(ProjectCategory)
            .filter(ProjectCategory.course_id == course_id)
            .filter(ProjectCategory.name == name)
            .filter(ProjectCategory.is_active == True)
            .filter(ProjectCategory.is_deleted == False)
        )
        if exclude_id:
            q = q.filter(ProjectCategory.id != exclude_id)
        return q.first() is not None

    def has_active_projects(self, category_id: UUID) -> bool:
        """Kategori altında arşivlenmemiş, soft-delete edilmemiş proje var mı?"""
        return (
            self.db.query(Project)
            .filter(Project.category_id == category_id)
            .filter(Project.is_archived == False)
            .filter(Project.is_active == True)
            .filter(Project.is_deleted == False)
            .first()
        ) is not None
