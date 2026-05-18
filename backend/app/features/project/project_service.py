"""
Project service (iş mantığı) modülü.

Proje oluşturma, listeleme, onay/red ve durum yönetiminin orkestrasyon katmanı.
"""

import math
import secrets
import string
from uuid import UUID

from sqlalchemy.orm import Session

from app.base.base_dto import PaginatedResponse
from app.base.base_service import BaseService
from app.common.enums import ProjectStatus, ProjectType, UserRole, NotificationType, ActivityAction, EntityType
from app.common.notification_helper import send_notification
from app.common.activity_log_helper import log_activity
from app.features.project.project_model import Project
from app.features.project.project_repo import ProjectRepo
from app.features.project.project_manager import ProjectManager
from app.features.project.project_dto import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectFilterParams,
)
from app.features.auth.auth_model import User


class ProjectService(BaseService[Project, ProjectRepo]):
    """Proje yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        super().__init__(ProjectRepo, db)
        self.manager = ProjectManager(db)

    def _enrich_with_course(self, project, response: ProjectResponse) -> ProjectResponse:
        """Proje response'una ders bilgisini ekler (project → course)."""
        try:
            if project.course_id and project.course:
                response.course_name = project.course.name
                response.course_code = project.course.code
        except Exception:
            pass
        return response

    def _to_response(self, project) -> ProjectResponse:
        """Proje nesnesini response DTO'ya dönüştürür; ders ve oluşturan ismi ekler."""
        response = ProjectResponse.model_validate(project)
        response = self._enrich_with_course(project, response)
        try:
            if project.creator:
                response.created_by_name = project.creator.full_name
        except Exception:
            pass
        return response

    def create_project(self, data: ProjectCreate, current_user: User) -> ProjectResponse:
        """
        Yeni proje oluşturur (DRAFT statüsünde).

        Args:
            data: Proje bilgileri
            current_user: Projeyi oluşturan kullanıcı

        Returns:
            ProjectResponse: Oluşturulan proje
        """
        # Benzersiz 8 karakterlik paylaşım kodu üret
        share_code = self._generate_unique_share_code()

        # Ders project_type kontrolü: dersin ayarına göre zorla veya doğrula
        resolved_type = data.project_type
        if data.course_id:
            from app.features.course.course_repo import CourseRepo
            course = CourseRepo(self.db).get_by_id(data.course_id)
            if course:
                if course.project_type == ProjectType.INDIVIDUAL:
                    resolved_type = ProjectType.INDIVIDUAL
                elif course.project_type == ProjectType.TEAM:
                    resolved_type = ProjectType.TEAM
                # BOTH → kullanıcının seçimine bırak

        project_data = {
            "title": data.title,
            "description": data.description,
            "course_id": data.course_id,
            "status": ProjectStatus.DRAFT,
            "created_by": current_user.id,
            "share_code": share_code,
            "project_type": resolved_type,
        }
        project = self.repo.create(project_data)
        log_activity(self.db, ActivityAction.PROJECT_CREATE, user_id=current_user.id,
                     entity_type=EntityType.PROJECT, entity_id=project.id,
                     details={"title": project.title})
        return self._to_response(project)

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
        if params.course_id:
            filters["course_id"] = params.course_id

        # STUDENT sadece kendi projelerini görür; teacher/admin ek filtre uygulayabilir
        if current_user.role == UserRole.STUDENT:
            filters["created_by"] = current_user.id
        elif params.created_by:
            filters["created_by"] = params.created_by

        # Admin Plan: TEACHER ve ADMIN için DRAFT projeler default GİZLİ.
        # Sadece sahip öğrenci kendi DRAFT'ını görür. Frontend status=DRAFT istese
        # bile staff sonucu boş döner.
        effective_exclude_status = params.exclude_status
        if current_user.role in (UserRole.TEACHER, UserRole.ADMIN):
            from app.common.enums import ProjectStatus
            if effective_exclude_status is None:
                effective_exclude_status = ProjectStatus.DRAFT
            if filters.get("status") == ProjectStatus.DRAFT:
                # Staff DRAFT görmek istiyorsa erken-dönüş ile boş set ver
                return PaginatedResponse(
                    items=[], total=0, page=params.page,
                    size=params.size, pages=0,
                )

        projects, total = self.repo.get_many_filtered(
            filters=filters,
            exclude_status=effective_exclude_status,
            search=params.search,
            search_fields=["title", "description"],
            grade_label=params.grade_label,
            student_search=params.student_search,
            branch_code=params.branch_code,
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [self._to_response(p) for p in projects]

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

        return self._to_response(project)

    def update_project(
        self, project_id: UUID, data: ProjectUpdate, current_user: User
    ) -> ProjectResponse:
        """
        Proje bilgilerini günceller. Sadece DRAFT projeler güncellenebilir.

        İçerik değişikliği yapıldığında rejected_at temizlenir (BL-4):
        → Bu sayede önceki red sonrası içerik güncellendi olarak işaretlenir
        → submit_for_approval artık bu projeyi tekrar onaya gönderebilir.

        Raises:
            NotFoundException, ForbiddenException, BadRequestException
        """
        project = self.repo.get_by_id_or_404(project_id)
        self.manager.validate_project_owner(project, current_user)

        if project.status != ProjectStatus.DRAFT:
            from app.common.exceptions import BadRequestException
            raise BadRequestException("Sadece DRAFT statüsündeki projeler güncellenebilir")

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}

        # BL-4: İçerik (title veya description) değiştiyse → red kaydını temizle
        if update_data.get("title") or update_data.get("description"):
            update_data["rejected_at"] = None

        updated = self.repo.update(project_id, update_data)
        return self._to_response(updated)

    def submit_for_approval(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """
        Projeyi onay için gönderir: DRAFT → PENDING.

        BL-4 kontrolü: Daha önce reddedilmiş bir proje, içerik değişikliği
        yapılmadan tekrar gönderilemez. rejected_at alanı dolduysa ve PATCH
        ile temizlenmediyse hata fırlatılır.
        """
        from app.common.exceptions import BadRequestException
        project = self.repo.get_by_id_or_404(project_id)
        self.manager.validate_project_owner(project, current_user)
        self.manager.validate_status_transition(project.status, ProjectStatus.PENDING)

        # BL-4: Reddedilmiş proje içerik değiştirmeden tekrar gönderilemez
        if project.rejected_at is not None:
            raise BadRequestException(
                "Bu proje daha önce reddedildi. Tekrar göndermeden önce "
                "başlık veya açıklamayı güncellemeniz gerekmektedir."
            )

        updated = self.repo.update(project_id, {"status": ProjectStatus.PENDING})
        return self._to_response(updated)

    def approve_project(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """Projeyi onaylar: PENDING → APPROVED. Sadece TEACHER/ADMIN."""
        project = self.repo.get_by_id_or_404(project_id)
        self.manager.validate_status_transition(project.status, ProjectStatus.APPROVED)
        updated = self.repo.update(project_id, {"status": ProjectStatus.APPROVED})
        log_activity(self.db, ActivityAction.PROJECT_APPROVE, user_id=current_user.id,
                     entity_type=EntityType.PROJECT, entity_id=project_id,
                     details={"title": project.title})
        # Proje sahibine bildirim gönder
        send_notification(
            db=self.db,
            user_id=project.created_by,
            type=NotificationType.PROJECT_APPROVED,
            title="Projeniz Onaylandı",
            message=f"'{project.title}' adlı projeniz onaylanmıştır. Artık görev oluşturabilirsiniz.",
            related_id=project.id
        )

        return self._to_response(updated)

    def reject_project(self, project_id: UUID, current_user: User, reason: str) -> ProjectResponse:
        """Projeyi reddeder: PENDING → REJECTED. Sadece TEACHER/ADMIN."""
        from datetime import datetime, timezone
        project = self.repo.get_by_id_or_404(project_id)
        self.manager.validate_status_transition(project.status, ProjectStatus.REJECTED)
        updated = self.repo.update(project_id, {
            "status": ProjectStatus.REJECTED,
            "rejected_at": datetime.now(timezone.utc),
            "rejection_reason": reason,
        })
        log_activity(self.db, ActivityAction.PROJECT_REJECT, user_id=current_user.id,
                     entity_type=EntityType.PROJECT, entity_id=project_id,
                     details={"title": project.title, "reason": reason})
        send_notification(
            db=self.db,
            user_id=project.created_by,
            type=NotificationType.PROJECT_REJECTED,
            title="Projeniz Reddedildi",
            message=f"'{project.title}' adlı projeniz reddedildi. Sebep: {reason[:100]}",
            related_id=project.id
        )

        return self._to_response(updated)

    def reopen_project(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """
        Reddedilmiş projeyi düzenlemeye açar: REJECTED → DRAFT.

        rejected_at korunur — submit_for_approval içerik değişikliği zorunlu kılar.
        Sadece proje sahibi veya Admin yapabilir.
        """
        project = self.repo.get_by_id_or_404(project_id)
        self.manager.validate_project_owner(project, current_user)
        self.manager.validate_status_transition(project.status, ProjectStatus.DRAFT)
        updated = self.repo.update(project_id, {"status": ProjectStatus.DRAFT})
        return self._to_response(updated)

    def delete_project(self, project_id: UUID, current_user: User) -> dict:
        """Projeyi yumuşak siler (is_deleted=True). Sadece DRAFT/REJECTED projeler silinebilir."""
        project = self.repo.get_by_id_or_404(project_id)
        self.manager.validate_deletable(project, current_user)
        self.repo.soft_delete(project_id)
        log_activity(self.db, ActivityAction.PROJECT_DELETE, user_id=current_user.id,
                     entity_type=EntityType.PROJECT, entity_id=project_id,
                     details={"title": project.title})
        return {"message": f"Proje başarıyla silindi: {project.title}"}

    def hard_delete_project(self, project_id: UUID, current_user: User) -> dict:
        """Projeyi kalıcı siler (hard delete). Sadece ADMIN kullanabilir."""
        from app.common.exceptions import ForbiddenException
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Bu işlem sadece adminler tarafından yapılabilir")
        project = self.repo.get_by_id_or_404(project_id, active_only=False)
        self.repo.delete(project_id)
        log_activity(self.db, ActivityAction.PROJECT_DELETE, user_id=current_user.id,
                     entity_type=EntityType.PROJECT, entity_id=project_id,
                     details={"title": project.title, "permanent": True})
        return {"message": f"Proje kalıcı olarak silindi: {project.title}"}

    def restore_project(self, project_id: UUID, current_user: User) -> ProjectResponse:
        """Silinmiş projeyi geri yükler. Sadece ADMIN kullanabilir."""
        from app.common.exceptions import ForbiddenException
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Bu işlem sadece adminler tarafından yapılabilir")
        restored = self.repo.restore(project_id)
        log_activity(self.db, ActivityAction.PROJECT_RESTORE, user_id=current_user.id,
                     entity_type=EntityType.PROJECT, entity_id=project_id,
                     details={"title": restored.title})
        return self._to_response(restored)

    def get_cascade_info(self, project_id: UUID, current_user: User) -> dict:
        """
        Soft delete öncesi etkilenecek bağlı kayıtların sayısını döner:
        - tasks: bu projeye ait görev sayısı
        - reports: bu projeye ait rapor sayısı
        - members: aktif üye sayısı (sahip dahil)
        """
        project = self.repo.get_by_id_or_404(project_id)
        # STUDENT yalnız kendi projesi için cascade-info sorabilir
        if (
            current_user.role == UserRole.STUDENT
            and str(project.created_by) != str(current_user.id)
        ):
            from app.common.exceptions import ForbiddenException
            raise ForbiddenException("Bu proje için bilgi alma yetkiniz yok")

        from app.features.task.task_repo import TaskRepo
        from app.features.report.report_repo import ReportRepo
        from app.features.project_member.project_member_repo import ProjectMemberRepo

        _, task_count = TaskRepo(self.db).get_many(filters={"project_id": project_id})
        _, report_count = ReportRepo(self.db).get_many(filters={"project_id": project_id})
        _, member_count = ProjectMemberRepo(self.db).get_many(filters={"project_id": project_id})
        return {"tasks": task_count, "reports": report_count, "members": member_count}

    def get_by_share_code(self, share_code: str) -> ProjectResponse:
        """Share link kodu ile projeyi getirir."""
        from app.common.exceptions import NotFoundException
        project = self.repo.get_by_share_code(share_code)
        if project is None:
            raise NotFoundException("Bu bağlantı kodu ile proje bulunamadı")
        return self._to_response(project)

    def _generate_unique_share_code(self, length: int = 8) -> str:
        """Benzersiz URL-safe alfanümerik kısa kod üretir."""
        alphabet = string.ascii_lowercase + string.digits
        for _ in range(10):  # max 10 deneme
            code = "".join(secrets.choice(alphabet) for _ in range(length))
            if self.repo.get_by_share_code(code) is None:
                return code
        # Çok nadir çakışma — UUID ile fallback
        import uuid
        return str(uuid.uuid4()).replace("-", "")[:length]
