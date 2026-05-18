"""
Course service (iş mantığı) modülü.

Ders CRUD ve listeleme orkestrasyon katmanı.
Enrollment sistemi kaldırıldı — öğrenci görünürlüğü bölüm eşleşmesiyle otomatik sağlanır.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.base.base_dto import PaginatedResponse
from app.base.base_service import BaseService
from app.common.enums import UserRole, ActivityAction, EntityType
from app.common.activity_log_helper import log_activity
from app.features.course.course_model import Course
from app.features.course.course_repo import CourseRepo
from app.features.course.course_manager import CourseManager
from app.features.course.course_dto import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseFilterParams,
)
from app.features.auth.auth_model import User


class CourseService(BaseService[Course, CourseRepo]):
    """Ders yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        super().__init__(CourseRepo, db)
        self.manager = CourseManager(db)

    def _to_response(self, course: Course) -> CourseResponse:
        """Course ORM nesnesini CourseResponse DTO'ya dönüştürür; teacher_name ekler."""
        data = CourseResponse.model_validate(course)
        if course.teacher:
            data.teacher_name = course.teacher.full_name
        return data

    def create_course(self, data: CourseCreate, current_user: User) -> CourseResponse:
        """
        Yeni ders oluşturur.
        Admin Plan A5: Sadece ADMIN oluşturabilir. Teacher artık ders oluşturamaz.
        Admin Plan A4: ADMIN, atanacak öğretmeni `teacher_id` ile belirler (zorunlu).
        Ders kodu büyük harfe dönüştürülür ve benzersiz olmalıdır.
        """
        self.manager.validate_can_create_course(current_user)
        self.manager.validate_course_code_unique(data.code)

        # A4: ADMIN için teacher_id zorunlu — Pydantic'te Optional ama burada
        # business rule olarak şart koşuluyor (UI dropdown'u zorunlu eder).
        if current_user.role == UserRole.ADMIN:
            if not data.teacher_id:
                from app.common.exceptions import BadRequestException
                raise BadRequestException("Ders oluştururken bir öğretmen atanmalı.")
            # Atanan kullanıcının TEACHER rolünde olduğunu doğrula
            from app.features.auth.auth_repo import AuthRepo
            target = AuthRepo(self.db).get_by_id_or_404(data.teacher_id)
            if target.role != UserRole.TEACHER:
                from app.common.exceptions import BadRequestException
                raise BadRequestException(
                    "Atamak istediğiniz kişi TEACHER rolünde değil."
                )
            effective_teacher_id = data.teacher_id
        else:
            # Teorik olarak buraya gelinmemeli (validate_can_create_course admin-only); güvenlik için.
            effective_teacher_id = current_user.id

        course_data = {
            "name": data.name,
            "code": data.code.upper(),
            "semester": data.semester,
            "teacher_id": effective_teacher_id,
            "department_id": data.department_id,
            "project_type": data.project_type,
            "require_youtube": data.require_youtube,
            "require_file": data.require_file,
        }
        course = self.repo.create(course_data)
        log_activity(self.db, ActivityAction.COURSE_CREATE, user_id=current_user.id,
                     entity_type=EntityType.COURSE, entity_id=course.id,
                     details={"name": course.name, "code": course.code})
        return self._to_response(course)

    def list_courses(
        self, params: CourseFilterParams, current_user: User,
    ) -> PaginatedResponse:
        """
        Rol bazlı filtreli ders listesi:
        - TEACHER: kendi dersleri
        - ADMIN: tüm dersler
        - STUDENT: bölümüyle eşleşen aktif dersler (enrollment gerektirmez)
        """
        filters = {}
        in_filters = {}

        if current_user.role == UserRole.TEACHER:
            filters["teacher_id"] = current_user.id

        elif current_user.role == UserRole.STUDENT:
            dept_ids = [d.id for d in current_user.departments]
            if not dept_ids:
                return PaginatedResponse(
                    items=[], total=0, page=params.page,
                    size=params.size, pages=0,
                )
            in_filters["department_id"] = dept_ids

        # Parametrik override filtreler
        if params.teacher_id:
            filters["teacher_id"] = params.teacher_id
        if params.semester:
            filters["semester"] = params.semester
        if params.department_id:
            filters["department_id"] = params.department_id

        courses, total = self.repo.get_many(
            filters=filters,
            in_filters=in_filters if in_filters else None,
            search=params.search,
            search_fields=["name", "code"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [self._to_response(c) for c in courses]

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
        return self._to_response(course)

    def update_course(
        self, course_id: UUID, data: CourseUpdate, current_user: User,
    ) -> CourseResponse:
        """
        Ders bilgilerini günceller.
        Sadece dersin öğretmeni veya ADMIN yapabilir.
        code alanı güncellenemez (DTO'da yok).
        """
        course = self.repo.get_by_id_or_404(course_id)
        self.manager.validate_teacher_owns_course(course, current_user)

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(course_id, update_data)
        log_activity(self.db, ActivityAction.COURSE_UPDATE, user_id=current_user.id,
                     entity_type=EntityType.COURSE, entity_id=course_id,
                     details=update_data)
        return self._to_response(updated)

    def delete_course(self, course_id: UUID, current_user: User) -> dict:
        """Dersi kalıcı siler (hard delete). Sadece öğretmeni veya ADMIN."""
        course = self.repo.get_by_id_or_404(course_id)
        self.manager.validate_teacher_owns_course(course, current_user)
        self.repo.delete(course_id)
        log_activity(self.db, ActivityAction.COURSE_DELETE, user_id=current_user.id,
                     entity_type=EntityType.COURSE, entity_id=course_id,
                     details={"name": course.name})
        return {"message": f"Ders başarıyla silindi: {course.name}"}
