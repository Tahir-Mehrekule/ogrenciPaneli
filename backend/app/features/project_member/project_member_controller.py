"""
Project Member controller (API endpoint) modülü.

Proje üyesi ekleme, çıkarma ve listeleme endpoint'lerini tanımlar.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.features.project_member.project_member_service import ProjectMemberService
from app.features.project_member.project_member_dto import (
    AddMemberRequest,
    ProjectMemberResponse,
)


router = APIRouter(
    prefix="/api/v1/projects/{project_id}/members",
    tags=["Project Members"],
)


@router.get(
    "",
    response_model=list[ProjectMemberResponse],
    summary="Proje üye listesi",
    description="Projedeki tüm aktif üyeleri listeler.",
)
def list_members(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proje üyelerini listeler. Giriş yapmış herkes görebilir."""
    return ProjectMemberService(db).list_members(project_id)


@router.post(
    "",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Üye ekle",
    description="Projeye yeni öğrenci üye ekler. Proje sahibi veya ADMIN yapabilir.",
)
def add_member(
    project_id: UUID,
    data: AddMemberRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Projeye üye ekler. Sadece STUDENT rolündeki kullanıcılar eklenebilir."""
    return ProjectMemberService(db).add_member(project_id, data, current_user)


@router.delete(
    "/{user_id}",
    summary="Üye çıkar",
    description="Projeden üye çıkarır. Proje sahibi veya ADMIN yapabilir.",
)
def remove_member(
    project_id: UUID,
    user_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Projeden üye çıkarır. Proje sahibi (created_by) çıkarılamaz."""
    return ProjectMemberService(db).remove_member(project_id, user_id, current_user)
