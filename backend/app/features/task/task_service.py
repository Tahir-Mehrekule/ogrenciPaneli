"""
Task service (iş mantığı) modülü.

Görev oluşturma, güncelleme, durum yönetimi ve listelemenin orkestrasyon katmanı.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.base.base_dto import PaginatedResponse
from app.base.base_service import BaseService
from app.common.enums import TaskStatus, UserRole, NotificationType
from app.common.notification_helper import send_notification
from app.common.exceptions import ForbiddenException
from app.features.task.task_model import Task
from app.features.task.task_repo import TaskRepo
from app.features.task.task_manager import TaskManager
from app.features.task.task_dto import (
    TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse, TaskFilterParams,
)
from app.features.project.project_repo import ProjectRepo
from app.features.project_member.project_member_repo import ProjectMemberRepo
from app.features.auth.auth_model import User


class TaskService(BaseService[Task, TaskRepo]):
    """Görev yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        super().__init__(TaskRepo, db)
        self.manager = TaskManager(db)
        self.project_repo = ProjectRepo(db)
        self.member_repo = ProjectMemberRepo(db)

    def _to_response(self, task) -> TaskResponse:
        """Task'i response DTO'ya dönüştürür ve assignee adını ekler."""
        response = TaskResponse.model_validate(task)
        try:
            if task.assignee:
                response.assignee_name = task.assignee.full_name
        except Exception:
            pass
        return response

    def create_task(self, data: TaskCreate, current_user: User) -> TaskResponse:
        """
        Yeni görev oluşturur (TODO statüsünde).

        Kurallar:
        - Proje sahibi / ADMIN → herhangi bir üyeye veya kendine atayabilir
        - ACTIVE üye → sadece kendine görev oluşturabilir
        - Diğer → yasak
        """
        project = self.project_repo.get_by_id_or_404(data.project_id)

        is_creator = str(project.created_by) == str(current_user.id)
        is_admin = current_user.role == UserRole.ADMIN
        is_member = self.member_repo.is_active_member(data.project_id, current_user.id)

        if not (is_creator or is_admin or is_member):
            raise ForbiddenException("Görev oluşturma yetkiniz yok")

        # Atama belirtilmediyse otomatik olarak görev oluşturana ata
        assigned_to = data.assigned_to or current_user.id

        # Üye (creator/admin değil) sadece kendine atayabilir
        if not (is_creator or is_admin) and str(assigned_to) != str(current_user.id):
            raise ForbiddenException("Sadece yönetici başka kullanıcılara görev atayabilir")

        # Atanan kişi proje üyesi mi? (Proje sahibi veya üye olmalı)
        self.manager.validate_assignee_is_member(assigned_to, data.project_id)

        task_data = {
            "title": data.title,
            "description": data.description,
            "project_id": data.project_id,
            "assigned_to": assigned_to,
            "status": TaskStatus.TODO,
            "due_date": data.due_date,
        }
        task = self.repo.create(task_data)

        # Başkası adına görev oluşturulduysa, atanan kişiye bildirim (kendisi atamadıysa)
        if assigned_to and str(assigned_to) != str(current_user.id):
            send_notification(
                db=self.db,
                user_id=assigned_to,
                type=NotificationType.TASK_ASSIGNED,
                title="Yeni Görev Atandı",
                message=f"'{project.title}' projesinde size '{task.title}' adlı yeni bir görev atandı.",
                related_id=task.id
            )

        return self._to_response(task)

    def list_tasks(self, params: TaskFilterParams, current_user: User) -> PaginatedResponse:
        """
        Rol bazlı görev listesi döner.

        - STUDENT: kendi oluşturduğu + üyesi olduğu projelerdeki görevler
        - TEACHER/ADMIN: tüm görevler
        """
        # Dinamik filtre oluştur
        filters = {}
        if params.project_id:
            filters["project_id"] = params.project_id
        if params.assigned_to:
            filters["assigned_to"] = params.assigned_to
        if params.status:
            filters["status"] = params.status
        if params.ai_suggested is not None:
            filters["ai_suggested"] = params.ai_suggested

        # STUDENT için proje kısıtlaması (IN filtresi):
        # Kendi oluşturduğu + ACTIVE üyesi olduğu projeler
        in_filters = {}
        if current_user.role == UserRole.STUDENT:
            member_project_ids = set(self.member_repo.get_user_project_ids(current_user.id))
            own_project_ids = {
                p.id for p in self.project_repo.get_many(
                    filters={"created_by": current_user.id}, size=1000,
                )[0]
            }
            visible_ids = list(member_project_ids | own_project_ids)
            # Hiç proje yoksa boş set dön (IN [] SQL hatasına düşmesin diye sentinel UUID)
            from uuid import UUID as _UUID
            in_filters["project_id"] = visible_ids or [_UUID("00000000-0000-0000-0000-000000000000")]

        tasks, total = self.repo.get_many(
            filters=filters,
            in_filters=in_filters if in_filters else None,
            search=params.search,
            search_fields=["title", "description"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [self._to_response(t) for t in tasks]

        return PaginatedResponse(
            items=items, total=total, page=params.page, size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_task(self, task_id: UUID, current_user: User) -> TaskResponse:
        """
        ID ile görev detayı.
        STUDENT: kendi oluşturduğu veya ACTIVE üyesi olduğu projedeki görevleri görür.
        """
        task = self.repo.get_by_id_or_404(task_id)

        if current_user.role == UserRole.STUDENT:
            project = self.project_repo.get_by_id_or_404(task.project_id)
            is_creator = str(project.created_by) == str(current_user.id)
            is_member = self.member_repo.is_active_member(task.project_id, current_user.id)
            if not (is_creator or is_member):
                raise ForbiddenException("Bu görevi görüntüleme yetkiniz yok")

        return self._to_response(task)

    def update_task(self, task_id: UUID, data: TaskUpdate, current_user: User) -> TaskResponse:
        """Görev bilgilerini günceller (PATCH). Proje sahibi veya ADMIN yapabilir."""
        task = self.repo.get_by_id_or_404(task_id)
        project = self.project_repo.get_by_id_or_404(task.project_id)

        if (
            str(project.created_by) != str(current_user.id)
            and current_user.role != UserRole.ADMIN
        ):
            raise ForbiddenException("Görev güncelleme yetkiniz yok")

        # Yeni atanan kişi proje üyesi mi?
        if data.assigned_to is not None:
            self.manager.validate_assignee_is_member(data.assigned_to, task.project_id)

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(task_id, update_data)
        
        # Atama değiştiyse bildirim gönder (ve atanan kişi kendisi değilse)
        if data.assigned_to is not None and str(data.assigned_to) != str(task.assigned_to) and str(data.assigned_to) != str(current_user.id):
            send_notification(
                db=self.db,
                user_id=data.assigned_to,
                type=NotificationType.TASK_ASSIGNED,
                title="Görev Size Atandı",
                message=f"'{project.title}' projesindeki '{updated.title}' adlı görev size atandı.",
                related_id=updated.id
            )
            
        return self._to_response(updated)

    def update_status(self, task_id: UUID, data: TaskStatusUpdate, current_user: User) -> TaskResponse:
        """Görev durumunu günceller. Durum geçişi kuralları manager'da kontrol edilir."""
        task = self.repo.get_by_id_or_404(task_id)
        self.manager.validate_task_status_transition(task, data.status, current_user)
        updated = self.repo.update(task_id, {"status": data.status})
        return self._to_response(updated)

    def delete_task(self, task_id: UUID, current_user: User) -> dict:
        """Görevi kalıcı siler (hard delete). Proje sahibi veya ADMIN yapabilir."""
        task = self.repo.get_by_id_or_404(task_id)
        project = self.project_repo.get_by_id_or_404(task.project_id)

        if (
            str(project.created_by) != str(current_user.id)
            and current_user.role != UserRole.ADMIN
        ):
            raise ForbiddenException("Görev silme yetkiniz yok")

        self.repo.delete(task_id)
        return {"message": f"Görev başarıyla silindi: {task.title}"}
