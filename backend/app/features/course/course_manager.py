"""
Course manager (yardımcı işlemler) modülü.

Ders oluşturma, güncelleme ve kayıt kurallarını doğrular.
"""

from app.common.enums import UserRole
from app.common.exceptions import (
    BadRequestException,
    ForbiddenException,
    ConflictException,
)
from app.features.course.course_repo import CourseRepo, CourseEnrollmentRepo
from app.features.auth.auth_model import User


def validate_course_code_unique(code: str, repo: CourseRepo) -> None:
    """
    Ders kodunun benzersiz olduğunu kontrol eder.

    Raises:
        ConflictException: Aynı kodda ders zaten varsa
    """
    existing = repo.get_by_code(code.upper())
    if existing:
        raise ConflictException(f"'{code}' kodlu ders zaten mevcut")


def validate_teacher_owns_course(course, user: User) -> None:
    """
    Kullanıcının dersin sahibi (öğretmeni) veya admin olduğunu kontrol eder.

    Raises:
        ForbiddenException: Kullanıcı dersin öğretmeni veya admin değilse
    """
    if str(course.teacher_id) != str(user.id) and user.role != UserRole.ADMIN:
        raise ForbiddenException("Bu ders üzerinde işlem yapmaya yetkiniz yok")


def validate_can_create_course(user: User) -> None:
    """
    Sadece TEACHER ve ADMIN ders oluşturabilir.

    Raises:
        ForbiddenException: Öğrenci ders oluşturmaya çalışırsa
    """
    if user.role == UserRole.STUDENT:
        raise ForbiddenException("Sadece öğretmenler ve adminler ders oluşturabilir")


def validate_enrollment(
    course,
    user: User,
    enrollment_repo: CourseEnrollmentRepo,
) -> None:
    """
    Derse kayıt validasyonu:
    1. Sadece öğrenciler (STUDENT) kaydolabilir
    2. Aynı derse birden fazla kaydolamaz
    3. Ders aktif olmalı

    Raises:
        BadRequestException: Öğrenci değilse veya ders pasifse
        ConflictException: Zaten kayıtlıysa
    """
    if user.role != UserRole.STUDENT:
        raise BadRequestException("Sadece öğrenciler derse kaydolabilir")

    if not course.is_active:
        raise BadRequestException("Pasif bir derse kaydolunmaz")

    if enrollment_repo.is_enrolled(course.id, user.id):
        raise ConflictException("Bu derse zaten kayıtlısınız")


def validate_unenrollment(
    course_id,
    user: User,
    enrollment_repo: CourseEnrollmentRepo,
) -> None:
    """
    Dersten çıkma validasyonu:
    1. Kayıtlı olmalı

    Raises:
        BadRequestException: Kayıtlı değilse
    """
    if not enrollment_repo.is_enrolled(course_id, user.id):
        raise BadRequestException("Bu derse kayıtlı değilsiniz")
