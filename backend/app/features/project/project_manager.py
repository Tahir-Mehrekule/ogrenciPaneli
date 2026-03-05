"""
Project manager (yardımcı işlemler) modülü.

Proje durum geçişleri ve yetki kurallarını yönetir.
"""

from app.common.enums import ProjectStatus, UserRole
from app.common.exceptions import BadRequestException, ForbiddenException
from app.features.project.project_model import Project
from app.features.auth.auth_model import User


# Geçerli durum geçişleri haritası
# {mevcut_durum: [geçilebilecek_durumlar]}
VALID_TRANSITIONS: dict[ProjectStatus, list[ProjectStatus]] = {
    ProjectStatus.DRAFT: [ProjectStatus.PENDING],
    ProjectStatus.PENDING: [ProjectStatus.APPROVED, ProjectStatus.REJECTED],
    ProjectStatus.APPROVED: [ProjectStatus.IN_PROGRESS],
    ProjectStatus.IN_PROGRESS: [ProjectStatus.COMPLETED],
    ProjectStatus.REJECTED: [ProjectStatus.DRAFT],   # Revize edip tekrar gönderebilir
    ProjectStatus.COMPLETED: [],                      # Tamamlanmış proje değiştirilemez
}


def validate_status_transition(current_status: ProjectStatus, new_status: ProjectStatus) -> None:
    """
    Durum geçişinin geçerli olup olmadığını kontrol eder.

    Args:
        current_status: Projenin mevcut durumu
        new_status: Geçilmek istenen yeni durum

    Raises:
        BadRequestException: Geçersiz durum geçişi
    """
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise BadRequestException(
            f"'{current_status.value}' durumundan '{new_status.value}' durumuna geçiş yapılamaz. "
            f"Geçerli geçişler: {[s.value for s in allowed] or 'Yok'}"
        )


def validate_project_owner(project: Project, user: User) -> None:
    """
    Kullanıcının proje sahibi veya admin olup olmadığını kontrol eder.

    Args:
        project: İşlem yapılacak proje
        user: İşlemi yapan kullanıcı

    Raises:
        ForbiddenException: Kullanıcı proje sahibi veya admin değilse
    """
    if str(project.created_by) != str(user.id) and user.role != UserRole.ADMIN:
        raise ForbiddenException("Bu proje üzerinde işlem yapmaya yetkiniz yok")


def validate_deletable(project: Project, user: User) -> None:
    """
    Projenin silinebilir durumda olup olmadığını kontrol eder.
    Sadece DRAFT veya REJECTED projeler silinebilir.

    Args:
        project: Silinmek istenen proje
        user: İşlemi yapan kullanıcı

    Raises:
        ForbiddenException: Proje silinebilir durumda değilse veya yetki yoksa
    """
    validate_project_owner(project, user)

    if project.status not in [ProjectStatus.DRAFT, ProjectStatus.REJECTED]:
        raise ForbiddenException(
            f"Sadece DRAFT veya REJECTED projeler silinebilir. "
            f"Mevcut durum: {project.status.value}"
        )
