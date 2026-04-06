"""
Course service (iş mantığı) modülü.

Ders CRUD, kayıt/çıkış ve listeleme orkestrasyon katmanı.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.enums import UserRole, ActivityAction, EntityType
from app.common.exceptions import NotFoundException
from app.common.activity_log_helper import log_activity
from app.features.course.course_model import Course, CourseEnrollment
from app.features.course.course_repo import CourseRepo, CourseEnrollmentRepo
from app.features.course.course_manager import (
    validate_course_code_unique,
    validate_teacher_owns_course,
    validate_can_create_course,
    validate_enrollment,
    validate_unenrollment,
)
from app.features.course.course_dto import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseFilterParams,
    EnrollmentResponse,
    CourseStudentResponse,
)
from app.features.auth.auth_model import User


class CourseService:
    """Ders yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = CourseRepo(db)
        self.enrollment_repo = CourseEnrollmentRepo(db)

    def create_course(self, data: CourseCreate, current_user: User) -> CourseResponse:
        """
        Yeni ders oluşturur.
        Sadece TEACHER/ADMIN oluşturabilir.
        Ders kodu büyük harfe dönüştürülür ve benzersiz olmalıdır.
        """
        validate_can_create_course(current_user)
        validate_course_code_unique(data.code, self.repo)

        course_data = {
            "name": data.name,
            "code": data.code.upper(),
            "semester": data.semester,
            "teacher_id": current_user.id,
            "require_youtube": data.require_youtube,
            "require_file": data.require_file,
        }
        course = self.repo.create(course_data)
        log_activity(self.db, ActivityAction.COURSE_CREATE, user_id=current_user.id,
                     entity_type=EntityType.COURSE, entity_id=course.id,
                     details={"name": course.name, "code": course.code})
        return CourseResponse.model_validate(course)

    def list_courses(
        self, params: CourseFilterParams, current_user: User,
    ) -> PaginatedResponse:
        """
        Rol bazlı filtreli ders listesi:
        - TEACHER: kendi dersleri
        - ADMIN: tüm dersler
        - STUDENT: tüm aktif dersler
        """
        # Dinamik filtre oluştur
        filters = {}
        if current_user.role == UserRole.TEACHER:
            filters["teacher_id"] = current_user.id
        if params.teacher_id:
            filters["teacher_id"] = params.teacher_id
        if params.semester:
            filters["semester"] = params.semester

        courses, total = self.repo.get_many(
            filters=filters,
            search=params.search,
            search_fields=["name", "code"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [CourseResponse.model_validate(c) for c in courses]

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_course(self, course_id: UUID) -> CourseResponse:
        """ID ile ders detayı."""
        course = self.repo.get_by_id_or_404(course_id)
        return CourseResponse.model_validate(course)

    def update_course(
        self, course_id: UUID, data: CourseUpdate, current_user: User,
    ) -> CourseResponse:
        """
        Ders bilgilerini günceller.
        Sadece dersin öğretmeni veya ADMIN yapabilir.
        code alanı güncellenemez (DTO'da yok).
        """
        course = self.repo.get_by_id_or_404(course_id)
        validate_teacher_owns_course(course, current_user)

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(course_id, update_data)
        log_activity(self.db, ActivityAction.COURSE_UPDATE, user_id=current_user.id,
                     entity_type=EntityType.COURSE, entity_id=course_id,
                     details=update_data)
        return CourseResponse.model_validate(updated)

    def delete_course(self, course_id: UUID, current_user: User) -> dict:
        """Dersi pasife al (soft delete). Sadece öğretmeni veya ADMIN."""
        course = self.repo.get_by_id_or_404(course_id)
        validate_teacher_owns_course(course, current_user)
        self.repo.delete(course_id)
        log_activity(self.db, ActivityAction.COURSE_DELETE, user_id=current_user.id,
                     entity_type=EntityType.COURSE, entity_id=course_id,
                     details={"name": course.name})
        return {"message": f"Ders başarıyla silindi: {course.name}"}

    # --- Enrollment (Kayıt) İşlemleri ---

    def enroll_student(self, course_id: UUID, current_user: User) -> EnrollmentResponse:
        """
        Öğrenciyi derse kaydeder.
        Sadece STUDENT kaydolabilir, aynı derse iki kez kaydolunamaz.
        """
        course = self.repo.get_by_id_or_404(course_id)
        validate_enrollment(course, current_user, self.enrollment_repo)

        enrollment = self.enrollment_repo.create({
            "course_id": course_id,
            "student_id": current_user.id,
        })

        return EnrollmentResponse(
            id=enrollment.id,
            course_id=enrollment.course_id,
            student_id=enrollment.student_id,
            enrolled_at=enrollment.created_at,
        )

    def unenroll_student(self, course_id: UUID, current_user: User) -> dict:
        """Öğrenciyi dersten çıkarır (soft delete)."""
        validate_unenrollment(course_id, current_user, self.enrollment_repo)

        enrollment = self.enrollment_repo.get_enrollment(course_id, current_user.id)
        if enrollment is None:
            raise NotFoundException("Kayıt bulunamadı")

        self.enrollment_repo.delete(enrollment.id)
        return {"message": "Dersten başarıyla çıkıldı"}

    def list_students(self, course_id: UUID, current_user: User) -> list[CourseStudentResponse]:
        """
        Dersin kayıtlı öğrenci listesi.
        Sadece dersin öğretmeni veya ADMIN görebilir.
        """
        course = self.repo.get_by_id_or_404(course_id)
        validate_teacher_owns_course(course, current_user)

        enrollments = self.enrollment_repo.get_students_by_course(course_id)
        return [
            CourseStudentResponse(
                id=e.student.id,
                email=e.student.email,
                name=e.student.name,
                enrolled_at=e.created_at,
            )
            for e in enrollments
        ]
