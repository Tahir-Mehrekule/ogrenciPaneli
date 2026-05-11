"""
Course manager (yardımcı işlemler) modülü.

Ders oluşturma, güncelleme ve kayıt kurallarını doğrular.
"""

from sqlalchemy.orm import Session

from app.base.base_manager import BaseManager
from app.common.enums import UserRole
from app.common.exceptions import (
    BadRequestException,
    ForbiddenException,
    ConflictException,
)
from app.features.course.course_repo import CourseRepo, CourseEnrollmentRepo
from app.features.auth.auth_model import User


class CourseManager(BaseManager):

    def __init__(self, db: Session):
        super().__init__(db)
        self.repo = CourseRepo(db)
        self.enrollment_repo = CourseEnrollmentRepo(db)

    def validate_course_code_unique(self, code: str) -> None:
        """Ders kodunun benzersiz olduğunu kontrol eder."""
        existing = self.repo.get_by_code(code.upper())
        if existing:
            raise ConflictException(f"'{code}' kodlu ders zaten mevcut")

    def validate_teacher_owns_course(self, course, user: User) -> None:
        """Kullanıcının dersin sahibi (öğretmeni) veya admin olduğunu kontrol eder."""
        if str(course.teacher_id) != str(user.id) and user.role != UserRole.ADMIN:
            raise ForbiddenException("Bu ders üzerinde işlem yapmaya yetkiniz yok")

    def validate_can_create_course(self, user: User) -> None:
        """Sadece TEACHER ve ADMIN ders oluşturabilir."""
        if user.role == UserRole.STUDENT:
            raise ForbiddenException("Sadece öğretmenler ve adminler ders oluşturabilir")

    def validate_enrollment(self, course, user: User) -> None:
        """Derse kayıt validasyonu."""
        if user.role != UserRole.STUDENT:
            raise BadRequestException("Sadece öğrenciler derse kaydolabilir")
        if not course.is_active:
            raise BadRequestException("Pasif bir derse kaydolunmaz")
        if self.enrollment_repo.is_enrolled(course.id, user.id):
            raise ConflictException("Bu derse zaten kayıtlısınız")

    def validate_unenrollment(self, course_id, user: User) -> None:
        """Dersten çıkma validasyonu."""
        if not self.enrollment_repo.is_enrolled(course_id, user.id):
            raise BadRequestException("Bu derse kayıtlı değilsiniz")
