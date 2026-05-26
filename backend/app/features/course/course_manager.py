"""
Course manager (yardımcı işlemler) modülü.

Ders oluşturma, güncelleme ve kayıt kurallarını doğrular.
"""

from sqlalchemy.orm import Session

from app.base.base_manager import BaseManager
from app.common.enums import UserRole
from app.common.exceptions import (
    ForbiddenException,
    ConflictException,
)
from app.features.course.course_repo import CourseRepo
from app.features.auth.auth_model import User


class CourseManager(BaseManager):

    def __init__(self, db: Session):
        super().__init__(db)
        self.repo = CourseRepo(db)

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
        """
        Admin Plan A5: Sadece ADMIN ders oluşturabilir.
        Öğretmen artık ders oluşturamaz — atandığı derse erişebilir.
        """
        if user.role != UserRole.ADMIN:
            raise ForbiddenException("Sadece sistem yöneticisi (ADMIN) ders oluşturabilir.")
