"""
Course repository (veri erişim) modülü.

Ders ve derse kayıt veritabanı işlemleri.
"""

from uuid import UUID
from typing import Optional

from sqlalchemy import desc, asc, func
from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.features.course.course_model import Course, CourseEnrollment


class CourseRepo(BaseRepository[Course]):
    """
    Ders CRUD operasyonları.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, get_many, count, update, delete, hard_delete

    get_many ile tüm filtreleme, arama, sayfalama ve sıralama
    işlemleri merkezi olarak yapılır — burada ayrıca yazılmaz (DRY).

    Ek sorgular:
    - get_by_code: Ders koduna göre getir (unique alan — duplicate kontrolü için)
    """

    def __init__(self, db: Session):
        super().__init__(Course, db)

    def get_by_code(self, code: str) -> Course | None:
        """Ders koduna göre getir (unique alan)."""
        return (
            self.db.query(Course)
            .filter(Course.code == code, Course.is_active == True)
            .first()
        )


class CourseEnrollmentRepo(BaseRepository[CourseEnrollment]):
    """Derse kayıt CRUD operasyonları."""

    def __init__(self, db: Session):
        super().__init__(CourseEnrollment, db)

    def is_enrolled(self, course_id: UUID, student_id: UUID) -> bool:
        """Öğrenci bu derse kayıtlı mı?"""
        return (
            self.db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.student_id == student_id,
                CourseEnrollment.is_active == True,
            )
            .first()
            is not None
        )

    def get_enrollment(self, course_id: UUID, student_id: UUID) -> CourseEnrollment | None:
        """Belirli kayıt kaydını getir."""
        return (
            self.db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.student_id == student_id,
                CourseEnrollment.is_active == True,
            )
            .first()
        )

    def get_students_by_course(self, course_id: UUID) -> list[CourseEnrollment]:
        """Derse kayıtlı tüm öğrencileri getir."""
        return (
            self.db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.is_active == True,
            )
            .all()
        )

    def get_courses_by_student(self, student_id: UUID) -> list[CourseEnrollment]:
        """Öğrencinin kayıtlı olduğu tüm dersleri getir."""
        return (
            self.db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.student_id == student_id,
                CourseEnrollment.is_active == True,
            )
            .all()
        )

    def count_by_course(self, course_id: UUID) -> int:
        """Derse kayıtlı öğrenci sayısını döner."""
        return (
            self.db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.is_active == True,
            )
            .count()
        )
