"""
Project service (iş mantığı) modülü.

Proje oluşturma, listeleme, onay/red ve durum yönetiminin orkestrasyon katmanı.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.enums import ProjectStatus, UserRole, NotificationType
from app.common.notification_helper import send_notification
from app.features.project.project_model import Project
from app.features.project.project_repo import ProjectRepo
from app.features.project.project_manager import (
    validate_status_transition,
    validate_project_owner,
    validate_deletable,
)
from app.features.project.project_dto import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectFilterParams,
)
from app.features.auth.auth_model import User


class ProjectService:
    """Proje yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepo(db)

    def create_project(self, data: ProjectCreate, current_user: User) -> ProjectResponse:
        """
        Yeni proje oluşturur (DRAFT statüsünde).

        Args:
            data: Proje bilgileri
            current_user: Projeyi oluşturan kullanıcı

        Returns:
            ProjectResponse: Oluşturulan proje
        """
        project_data = {
            "title": data.title,
            "description": data.description,
            "course_id": data.course_id,
            "status": ProjectStatus.DRAFT,
            "created_by": current_user.id,
        }
        project = self.repo.create(project_data)
        return ProjectResponse.model_validate(project)

    def list_projects(self, params: ProjectFilterParams, current_user: User) -> PaginatedResponse:
        """
        Rol bazlı filtreli proje listesi döner.

        - STUDENT: sadece kendi projeleri
        - TEACHER/ADMIN: tüm projeler (filtreli)

        Args:
            params: Filtreleme + sayfalama parametreleri
            current_user: İsteği yapan kullanıcı

        Returns:
            PaginatedResponse[ProjectResponse]: Sayfalanmış proje listesi
        """
        # Dinamik filtre oluştur
        filters = {}
        if params.status:
            filters["status"] = params.status
        if params.created_by:
            filters["created_by"] = params.created_by

        # STUDENT sadece kendi projelerini görür
        if current_user.role == UserRole.STUDENT:
            filters["created_by"] = current_user.id

        projects, total = self.repo.get_many(
            filters=filters,
            search=params.search,
            search_fields=["title", "description"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [ProjectResponse.model_validate(p) for p in projects]

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_project(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """
        ID ile proje detayı döner.

        Raises:
            NotFoundException: Proje bulunamazsa
            ForbiddenException: Öğrenci başkasının projesini görmeye çalışırsa
        """
        project = self.repo.get_by_id_or_404(project_id)

        # STUDENT sadece kendi projesini görebilir
        if (
            current_user.role == UserRole.STUDENT
            and str(project.created_by) != str(current_user.id)
        ):
            from app.common.exceptions import ForbiddenException
            raise ForbiddenException("Bu projeyi görüntüleme yetkiniz yok")

        return ProjectResponse.model_validate(project)

    def update_project(
        self, project_id: UUID, data: ProjectUpdate, current_user: User
    ) -> ProjectResponse:
        """
        Proje bilgilerini günceller. Sadece DRAFT projeler güncellenebilir.

        Raises:
            NotFoundException, ForbiddenException, BadRequestException
        """
        project = self.repo.get_by_id_or_404(project_id)
        validate_project_owner(project, current_user)

        if project.status != ProjectStatus.DRAFT:
            from app.common.exceptions import BadRequestException
            raise BadRequestException("Sadece DRAFT statüsündeki projeler güncellenebilir")

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(project_id, update_data)
        return ProjectResponse.model_validate(updated)

    def submit_for_approval(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """Projeyi onay için gönderir: DRAFT → PENDING."""
        project = self.repo.get_by_id_or_404(project_id)
        validate_project_owner(project, current_user)
        validate_status_transition(project.status, ProjectStatus.PENDING)
        updated = self.repo.update(project_id, {"status": ProjectStatus.PENDING})
        return ProjectResponse.model_validate(updated)

    def approve_project(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """Projeyi onaylar: PENDING → APPROVED. Sadece TEACHER/ADMIN."""
        project = self.repo.get_by_id_or_404(project_id)
        validate_status_transition(project.status, ProjectStatus.APPROVED)
        updated = self.repo.update(project_id, {"status": ProjectStatus.APPROVED})
        
        # Proje sahibine bildirim gönder
        send_notification(
            db=self.db,
            user_id=project.created_by,
            type=NotificationType.PROJECT_APPROVED,
            title="Projeniz Onaylandı",
            message=f"'{project.title}' adlı projeniz onaylanmıştır. Artık görev oluşturabilirsiniz.",
            related_id=project.id
        )
        
        return ProjectResponse.model_validate(updated)

    def reject_project(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """Projeyi reddeder: PENDING → REJECTED. Sadece TEACHER/ADMIN."""
        project = self.repo.get_by_id_or_404(project_id)
        validate_status_transition(project.status, ProjectStatus.REJECTED)
        updated = self.repo.update(project_id, {"status": ProjectStatus.REJECTED})
        
        # Proje sahibine bildirim gönder
        send_notification(
            db=self.db,
            user_id=project.created_by,
            type=NotificationType.PROJECT_REJECTED,
            title="Projeniz Reddedildi",
            message=f"'{project.title}' adlı projeniz reddedildi. Lütfen detaylı bilgi alıp tekrar deneyin.",
            related_id=project.id
        )
        
        return ProjectResponse.model_validate(updated)

    def delete_project(self, project_id: UUID, current_user: User) -> dict:
        """Projeyi siler (soft delete). Sadece DRAFT/REJECTED projeler silinebilir."""
        project = self.repo.get_by_id_or_404(project_id)
        validate_deletable(project, current_user)
        self.repo.delete(project_id)
        return {"message": f"Proje başarıyla silindi: {project.title}"}
