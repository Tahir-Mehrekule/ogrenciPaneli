"""
Task manager (yardımcı işlemler) modülü.

Görev durum geçişleri ve atama kurallarını yönetir.
"""

from sqlalchemy.orm import Session

from app.base.base_manager import BaseManager
from app.common.enums import TaskStatus, UserRole
from app.common.exceptions import BadRequestException, ForbiddenException
from app.features.task.task_model import Task
from app.features.auth.auth_model import User
from app.features.project_member.project_member_repo import ProjectMemberRepo
from app.features.project.project_repo import ProjectRepo

TASK_TRANSITIONS: dict = {
    TaskStatus.TODO: {
        TaskStatus.IN_PROGRESS: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
    },
    TaskStatus.IN_PROGRESS: {
        TaskStatus.REVIEW: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
        TaskStatus.TODO: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
    },
    TaskStatus.REVIEW: {
        TaskStatus.DONE: [UserRole.TEACHER, UserRole.ADMIN],
        TaskStatus.IN_PROGRESS: [UserRole.TEACHER, UserRole.ADMIN],
    },
    TaskStatus.DONE: {},
}


class TaskManager(BaseManager):

    def __init__(self, db: Session):
        super().__init__(db)
        self.member_repo = ProjectMemberRepo(db)
        self.project_repo = ProjectRepo(db)

    def validate_task_status_transition(
        self, task: Task, new_status: TaskStatus, user: User
    ) -> None:
        """
        Görev durum geçişinin kullanıcı rolüne göre geçerli olup olmadığını kontrol eder.

        Özel kurallar:
        - Proje sahibi (creator) ve ADMIN her geçişi yapabilir (ileri + geri).
        - TEACHER: TASK_TRANSITIONS mapping'ine göre.
        - STUDENT/üye: TASK_TRANSITIONS mapping'ine göre; REVIEW → DONE yasak.
        """
        # ADMIN her geçişi yapabilir
        if user.role == UserRole.ADMIN:
            return

        # Proje sahibi (creator) her geçişi yapabilir — DONE → herhangi geri alma dahil
        project = self.project_repo.get_by_id(task.project_id)
        if project and str(project.created_by) == str(user.id):
            return

        allowed_transitions = TASK_TRANSITIONS.get(task.status, {})

        if new_status not in allowed_transitions:
            raise BadRequestException(
                f"'{task.status.value}' durumundan '{new_status.value}' durumuna geçiş yapılamaz. "
                f"Geçerli geçişler: {[s.value for s in allowed_transitions.keys()] or 'Yok'}"
            )

        allowed_roles = allowed_transitions[new_status]
        if user.role not in allowed_roles:
            raise ForbiddenException(
                f"Bu durum geçişi için yetkiniz yok. Gerekli roller: {[r.value for r in allowed_roles]}"
            )

    def validate_assignee_is_member(self, assigned_to, project_id) -> None:
        """
        Atanan kullanıcının projede üye olduğunu kontrol eder.

        - Proje sahibi (created_by) her zaman geçerli atanabilir kullanıcıdır
          (bireysel projelerde member tablosunda kayıt yoktur).
        - Diğer kullanıcılar için ACTIVE üyelik kontrolü yapılır.
        """
        if assigned_to is None:
            return
        project = self.project_repo.get_by_id(project_id)
        if project and str(project.created_by) == str(assigned_to):
            return
        if not self.member_repo.is_active_member(project_id, assigned_to):
            raise BadRequestException("Görev sadece projede üye olan kullanıcılara atanabilir")
