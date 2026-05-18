"""
Course controller (API endpoint) modülü.

Ders yönetimi endpoint'lerini tanımlar.
Enrollment endpoint'leri kaldırıldı — öğrenci görünürlüğü bölüm eşleşmesiyle otomatik sağlanır.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.common.enums import UserRole
from app.base.base_dto import PaginatedResponse, MessageResponse
from app.features.course.course_service import CourseService
from app.features.course.course_dto import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseFilterParams,
)


router = APIRouter(
    prefix="/api/v1/courses",
    tags=["Courses"],
)


@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ders oluştur",
)
def create_course(
    data: CourseCreate,
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Yeni ders oluşturur. Admin Plan A5: Sadece ADMIN."""
    return CourseService(db).create_course(data, current_user)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Ders listesi",
)
def list_courses(
    params: CourseFilterParams = Depends(),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Filtreli ders listesi.
    - TEACHER: sadece kendi dersleri
    - STUDENT: bölümüyle eşleşen dersler (enrollment gerektirmez)
    - ADMIN: tüm dersler
    """
    return CourseService(db).list_courses(params, current_user)


@router.get(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Ders detayı",
)
def get_course(
    course_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ID ile ders detayı."""
    return CourseService(db).get_course(course_id)


@router.patch(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Ders güncelleme",
)
def update_course(
    course_id: UUID,
    data: CourseUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ders bilgilerini günceller. Sadece dersin öğretmeni veya ADMIN."""
    return CourseService(db).update_course(course_id, data, current_user)


@router.delete(
    "/{course_id}",
    response_model=MessageResponse,
    summary="Ders sil",
)
def delete_course(
    course_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft delete. Sadece dersin öğretmeni veya ADMIN."""
    return CourseService(db).delete_course(course_id, current_user)
