"""
ClassSection Controller.

Sadece TEACHER + ADMIN sınıf-şube oluşturabilir/düzenleyebilir.
Stats endpoint herkese açık (kendi bölümünü görenler için).
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import role_required, get_current_user
from app.common.enums import UserRole
from app.features.auth.auth_model import User
from app.features.class_section.class_section_service import ClassSectionService
from app.features.class_section.class_section_dto import (
    ClassSectionCreate,
    ClassSectionUpdate,
    ClassSectionResponse,
    ClassSectionStats,
)
from app.base.base_dto import PaginatedResponse


router = APIRouter(
    prefix="/api/v1/class-sections",
    tags=["ClassSections"],
)

_staff_only = Depends(role_required([UserRole.TEACHER, UserRole.ADMIN]))


@router.post(
    "",
    response_model=ClassSectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni şube oluştur",
)
def create_section(
    data: ClassSectionCreate,
    _=_staff_only,
    db: Session = Depends(get_db),
):
    return ClassSectionService(db).create(data)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Şubeleri listele",
)
def list_sections(
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
    department_id: Optional[UUID] = Query(None),
    grade_label: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ClassSectionService(db).list(
        page=page, size=size,
        department_id=department_id, grade_label=grade_label,
    )


@router.get(
    "/stats",
    response_model=ClassSectionStats,
    summary="Sınıf düzeyi istatistiği",
    description="Verilen sınıf etiketinde öğrenci sayısı + şube listesi. Sekme header'larında kullanılır.",
)
def get_stats(
    grade_label: str = Query(..., description="Örn: '2. Sınıf'"),
    department_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ClassSectionService(db).get_stats(grade_label, department_id)


@router.get(
    "/{section_id}",
    response_model=ClassSectionResponse,
    summary="Şube detayı",
)
def get_section(
    section_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ClassSectionService(db).get(section_id)


@router.patch(
    "/{section_id}",
    response_model=ClassSectionResponse,
    summary="Şube güncelle",
)
def update_section(
    section_id: UUID,
    data: ClassSectionUpdate,
    _=_staff_only,
    db: Session = Depends(get_db),
):
    return ClassSectionService(db).update(section_id, data)


@router.delete(
    "/{section_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Şube sil (soft delete)",
)
def delete_section(
    section_id: UUID,
    _=_staff_only,
    db: Session = Depends(get_db),
):
    ClassSectionService(db).delete(section_id)
