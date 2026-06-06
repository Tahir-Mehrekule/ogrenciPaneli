"""
Project manager (yardımcı işlemler) modülü.

Proje durum geçişleri ve yetki kurallarını yönetir.
"""

from sqlalchemy.orm import Session

from app.base.base_manager import BaseManager
from app.common.enums import ProjectStatus
from app.common.exceptions import BadRequestException, ForbiddenException
from app.features.project.project_model import Project
from app.features.auth.auth_model import User

VALID_TRANSITIONS: dict[ProjectStatus, list[ProjectStatus]] = {
    ProjectStatus.DRAFT: [ProjectStatus.PENDING],
    ProjectStatus.PENDING: [ProjectStatus.APPROVED, ProjectStatus.REJECTED],
    ProjectStatus.APPROVED: [ProjectStatus.IN_PROGRESS],
    ProjectStatus.IN_PROGRESS: [ProjectStatus.COMPLETED],
    ProjectStatus.REJECTED: [ProjectStatus.DRAFT],
    ProjectStatus.COMPLETED: [],
}


class ProjectManager(BaseManager):

    def __init__(self, db: Session):
        super().__init__(db)

    def validate_status_transition(
        self, current_status: ProjectStatus, new_status: ProjectStatus
    ) -> None:
        """Durum geçişinin geçerli olup olmadığını kontrol eder."""
        allowed = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise BadRequestException(
                f"'{current_status.value}' durumundan '{new_status.value}' durumuna geçiş yapılamaz. "
                f"Geçerli geçişler: {[s.value for s in allowed] or 'Yok'}"
            )

    def validate_project_owner(self, project: Project, user: User) -> None:
        """Kullanıcının proje sahibi veya admin olup olmadığını kontrol eder."""
        self.require_owner_or_admin(project, "created_by", user, entity_name="proje")

    def validate_deletable(self, project: Project, user: User) -> None:
        """Projenin silinebilir durumda olup olmadığını kontrol eder."""
        self.validate_project_owner(project, user)
        if project.status not in [ProjectStatus.DRAFT, ProjectStatus.REJECTED]:
            raise ForbiddenException(
                f"Sadece DRAFT veya REJECTED projeler silinebilir. "
                f"Mevcut durum: {project.status.value}"
            )
