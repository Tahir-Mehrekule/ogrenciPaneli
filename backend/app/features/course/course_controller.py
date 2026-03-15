"""
Course controller (API endpoint) modülü.

Ders yönetimi ve derse kayıt endpoint'lerini tanımlar.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.common.enums import UserRole
from app.common.base_dto import PaginatedResponse, MessageResponse
from app.features.course.course_service import CourseService
from app.features.course.course_dto import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseFilterParams,
    EnrollmentResponse,
    CourseStudentResponse,
)


router = APIRouter(
    prefix="/api/v1/courses",
    tags=["Courses"],
)


# --- Ders CRUD ---

@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ders oluştur",
)
def create_course(
    data: CourseCreate,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Yeni ders oluşturur. Sadece TEACHER/ADMIN."""
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
    """Filtreli ders listesi. TEACHER sadece kendi derslerini görür."""
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


# --- Derse Kayıt (Enrollment) ---

@router.post(
    "/{course_id}/enroll",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Derse kaydol",
)
def enroll(
    course_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Öğrenci derse kaydolur. Sadece STUDENT."""
    return CourseService(db).enroll_student(course_id, current_user)


@router.delete(
    "/{course_id}/unenroll",
    response_model=MessageResponse,
    summary="Dersten çık",
)
def unenroll(
    course_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Öğrenci dersten çıkar."""
    return CourseService(db).unenroll_student(course_id, current_user)


@router.get(
    "/{course_id}/students",
    response_model=list[CourseStudentResponse],
    summary="Derse kayıtlı öğrenciler",
)
def list_students(
    course_id: UUID,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Dersin kayıtlı öğrencilerini listeler. Sadece öğretmeni veya ADMIN."""
    return CourseService(db).list_students(course_id, current_user)
