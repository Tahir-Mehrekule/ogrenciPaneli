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
from app.features.course.course_dto import CourseFilterParams


class CourseRepo(BaseRepository[Course]):
    """Ders CRUD + filtreleme operasyonları."""

    def __init__(self, db: Session):
        super().__init__(Course, db)

    def get_by_code(self, code: str) -> Course | None:
        """Ders koduna göre getir (unique alan)."""
        return (
            self.db.query(Course)
            .filter(Course.code == code, Course.is_active == True)
            .first()
        )

    def get_filtered(
        self,
        params: CourseFilterParams,
        teacher_id: Optional[UUID] = None,
    ) -> tuple[list[Course], int]:
        """
        Filtreli ve sayfalanmış ders listesi.

        Args:
            params: Filtreleme parametreleri
            teacher_id: Sadece bu öğretmenin derslerini getir (opsiyonel)

        Returns:
            (ders_listesi, toplam_sayı)
        """
        query = self.db.query(Course).filter(Course.is_active == True)

        # Öğretmen filtresi
        if teacher_id:
            query = query.filter(Course.teacher_id == teacher_id)
        if params.teacher_id:
            query = query.filter(Course.teacher_id == params.teacher_id)

        # Dönem filtresi
        if params.semester:
            query = query.filter(Course.semester == params.semester)

        # Arama (ders adı veya kodu)
        if params.search:
            search_term = f"%{params.search}%"
            query = query.filter(
                (Course.name.ilike(search_term)) | (Course.code.ilike(search_term))
            )

        total = query.count()

        # Sıralama
        sort_column = getattr(Course, params.sort_by, Course.created_at)
        query = query.order_by(
            desc(sort_column) if params.order == "desc" else asc(sort_column)
        )

        # Sayfalama
        skip = (params.page - 1) * params.size
        items = query.offset(skip).limit(params.size).all()

        return items, total


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
