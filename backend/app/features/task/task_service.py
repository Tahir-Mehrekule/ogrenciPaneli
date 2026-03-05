"""
Task service (iş mantığı) modülü.

Görev oluşturma, güncelleme, durum yönetimi ve listelemenin orkestrasyon katmanı.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.enums import TaskStatus, UserRole
from app.common.exceptions import ForbiddenException
from app.features.task.task_model import Task
from app.features.task.task_repo import TaskRepo
from app.features.task.task_manager import validate_task_status_transition, validate_assignee_is_member
from app.features.task.task_dto import (
    TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse, TaskFilterParams,
)
from app.features.project.project_repo import ProjectRepo
from app.features.project_member.project_member_repo import ProjectMemberRepo
from app.features.auth.auth_model import User


class TaskService:
    """Görev yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskRepo(db)
        self.project_repo = ProjectRepo(db)
        self.member_repo = ProjectMemberRepo(db)

    def create_task(self, data: TaskCreate, current_user: User) -> TaskResponse:
        """
        Yeni görev oluşturur (TODO statüsünde).

        Kurallar:
        - Proje sahibi veya ADMIN oluşturabilir
        - Atanan kişi projede üye olmalı
        """
        project = self.project_repo.get_by_id_or_404(data.project_id)

        # Yetki kontrolü
        if (
            str(project.created_by) != str(current_user.id)
            and current_user.role != UserRole.ADMIN
        ):
            raise ForbiddenException("Görev oluşturma yetkiniz yok")

        # Atanan kişi proje üyesi mi?
        validate_assignee_is_member(data.assigned_to, data.project_id, self.member_repo)

        task_data = {
            "title": data.title,
            "description": data.description,
            "project_id": data.project_id,
            "assigned_to": data.assigned_to,
            "status": TaskStatus.TODO,
            "due_date": data.due_date,
        }
        task = self.repo.create(task_data)
        return TaskResponse.model_validate(task)

    def list_tasks(self, params: TaskFilterParams, current_user: User) -> PaginatedResponse:
        """
        Rol bazlı görev listesi döner.

        - STUDENT: sadece üyesi olduğu projelerdeki görevler
        - TEACHER/ADMIN: tüm görevler
        """
        project_ids = None
        if current_user.role == UserRole.STUDENT:
            project_ids = self.member_repo.get_user_projects(current_user.id)

        tasks, total = self.repo.get_filtered(params, project_ids=project_ids)
        items = [TaskResponse.model_validate(t) for t in tasks]

        return PaginatedResponse(
            items=items, total=total, page=params.page, size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_task(self, task_id: UUID, current_user: User) -> TaskResponse:
        """ID ile görev detayı. STUDENT sadece erişim yetkisi olan görevleri görebilir."""
        task = self.repo.get_by_id_or_404(task_id)

        if current_user.role == UserRole.STUDENT:
            allowed_projects = self.member_repo.get_user_projects(current_user.id)
            if task.project_id not in allowed_projects:
                raise ForbiddenException("Bu görevi görüntüleme yetkiniz yok")

        return TaskResponse.model_validate(task)

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
            validate_assignee_is_member(data.assigned_to, task.project_id, self.member_repo)

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(task_id, update_data)
        return TaskResponse.model_validate(updated)

    def update_status(self, task_id: UUID, data: TaskStatusUpdate, current_user: User) -> TaskResponse:
        """Görev durumunu günceller. Durum geçişi kuralları manager'da kontrol edilir."""
        task = self.repo.get_by_id_or_404(task_id)
        validate_task_status_transition(task, data.status, current_user)
        updated = self.repo.update(task_id, {"status": data.status})
        return TaskResponse.model_validate(updated)

    def delete_task(self, task_id: UUID, current_user: User) -> dict:
        """Görevi soft delete ile siler. Proje sahibi veya ADMIN yapabilir."""
        task = self.repo.get_by_id_or_404(task_id)
        project = self.project_repo.get_by_id_or_404(task.project_id)

        if (
            str(project.created_by) != str(current_user.id)
            and current_user.role != UserRole.ADMIN
        ):
            raise ForbiddenException("Görev silme yetkiniz yok")

        self.repo.delete(task_id)
        return {"message": f"Görev başarıyla silindi: {task.title}"}
