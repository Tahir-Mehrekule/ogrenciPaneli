"""
Task manager (yardımcı işlemler) modülü.

Görev durum geçişleri ve atama kurallarını yönetir.
"""

from app.common.enums import TaskStatus, UserRole
from app.common.exceptions import BadRequestException, ForbiddenException
from app.features.task.task_model import Task
from app.features.auth.auth_model import User


# Geçerli durum geçişleri ve hangi rolün yapabileceği
# {mevcut_durum: {yeni_durum: [izin verilen roller]}}
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
    TaskStatus.DONE: {},  # Tamamlanmış görev değiştirilemez
}


def validate_task_status_transition(
    task: Task,
    new_status: TaskStatus,
    user: User,
) -> None:
    """
    Görev durum geçişinin kullanıcı rolüne göre geçerli olup olmadığını kontrol eder.

    Atanan kişi veya proje sahibi geçiş yapabilir.
    REVIEW → DONE sadece TEACHER/ADMIN yapabilir.

    Args:
        task: Güncellenecek görev
        new_status: Geçilmek istenen yeni durum
        user: İşlemi yapan kullanıcı

    Raises:
        BadRequestException: Geçersiz durum geçişi
        ForbiddenException: Kullanıcının bu geçişi yapma yetkisi yok
    """
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


def validate_assignee_is_member(
    assigned_to,
    project_id,
    member_repo,
) -> None:
    """
    Atanan kullanıcının projede üye olduğunu kontrol eder.

    Args:
        assigned_to: Atanacak kullanıcı UUID'si
        project_id: Proje UUID'si
        member_repo: ProjectMemberRepo instance'ı

    Raises:
        BadRequestException: Kullanıcı projede üye değilse
    """
    if assigned_to is None:
        return  # Atama yoksa kontrol gerekmez

    if not member_repo.is_member(project_id, assigned_to):
        raise BadRequestException("Görev sadece projede üye olan kullanıcılara atanabilir")
