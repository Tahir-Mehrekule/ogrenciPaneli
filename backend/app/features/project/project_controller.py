"""
Project controller (API endpoint) modülü.

Proje yönetimi endpoint'lerini tanımlar.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.common.enums import UserRole
from app.common.base_dto import PaginatedResponse
from app.features.project.project_service import ProjectService
from app.features.project.project_dto import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectFilterParams,
)


router = APIRouter(
    prefix="/api/v1/projects",
    tags=["Projects"],
)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Proje oluştur",
)
def create_project(
    data: ProjectCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Yeni proje oluşturur. DRAFT statüsünde başlar."""
    return ProjectService(db).create_project(data, current_user)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Proje listesi",
)
def list_projects(
    params: ProjectFilterParams = Depends(),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Filtreli proje listesi. STUDENT sadece kendi projelerini görür."""
    return ProjectService(db).list_projects(params, current_user)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Proje detayı",
)
def get_project(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ID ile proje detayı."""
    return ProjectService(db).get_project(project_id, current_user)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Proje güncelleme",
)
def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proje güncelleme (PATCH). Sadece DRAFT projeler güncellenebilir."""
    return ProjectService(db).update_project(project_id, data, current_user)


@router.post(
    "/{project_id}/submit",
    response_model=ProjectResponse,
    summary="Onaya gönder",
)
def submit_for_approval(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Projeyi onay için gönderir: DRAFT → PENDING."""
    return ProjectService(db).submit_for_approval(project_id, current_user)


@router.post(
    "/{project_id}/approve",
    response_model=ProjectResponse,
    summary="Projeyi onayla",
)
def approve_project(
    project_id: UUID,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Projeyi onaylar: PENDING → APPROVED. Sadece TEACHER/ADMIN."""
    return ProjectService(db).approve_project(project_id, current_user)


@router.post(
    "/{project_id}/reject",
    response_model=ProjectResponse,
    summary="Projeyi reddet",
)
def reject_project(
    project_id: UUID,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Projeyi reddeder: PENDING → REJECTED. Sadece TEACHER/ADMIN."""
    return ProjectService(db).reject_project(project_id, current_user)


@router.delete(
    "/{project_id}",
    summary="Proje sil",
)
def delete_project(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft delete. Sadece DRAFT/REJECTED projeler silinebilir."""
    return ProjectService(db).delete_project(project_id, current_user)


@router.get(
    "/join/{share_code}",
    response_model=ProjectResponse,
    summary="Share link ile projeyi bul",
    description="8 karakterlik paylaşım kodu ile projeyi getirir. Giriş yapmış herkes erişebilir.",
)
def get_by_share_code(
    share_code: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectService(db).get_by_share_code(share_code)
