"""
Course (ders) veritabanı modeli.

Öğretmenlerin oluşturduğu dersleri temsil eder.
Projeler bir derse bağlanır, öğrenciler derslere kaydolur.
"""

from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.base.base_model import BaseModel


class Course(BaseModel):
    """
    Ders tablosu (courses).

    Alanlar:
    - name: Ders adı (örn: "Yazılım Mühendisliği")
    - code: Ders kodu, unique (örn: "CENG314")
    - semester: Dönem bilgisi (örn: "2025-2026 Güz")
    - teacher_id: Dersin öğretmeni (FK → users.id)

    BaseModel'den miras: id, created_at, updated_at, is_active
    """

    __tablename__ = "courses"

    name = Column(
        String(200),
        nullable=False,
        comment="Ders adı"
    )

    code = Column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
        comment="Ders kodu (unique, örn: CENG314)"
    )

    semester = Column(
        String(50),
        nullable=False,
        comment="Dönem bilgisi (örn: 2025-2026 Güz)"
    )

    teacher_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Dersin öğretmeni"
    )

    # İlişkiler
    teacher = relationship("User", foreign_keys=[teacher_id], lazy="select")
    enrollments = relationship("CourseEnrollment", back_populates="course", lazy="select")

    def __repr__(self):
        return f"<Course(id={self.id}, code={self.code}, name={self.name})>"


class CourseEnrollment(BaseModel):
    """
    Derse kayıt tablosu (course_enrollments).

    Bir öğrenci bir derse yalnızca bir kez kaydolabilir (UniqueConstraint).

    Alanlar:
    - course_id: Kurs ID'si (FK → courses.id)
    - student_id: Öğrenci ID'si (FK → users.id)

    BaseModel'den miras: id, created_at (kaydolma tarihi yerine), updated_at, is_active
    """

    __tablename__ = "course_enrollments"
    __table_args__ = (
        UniqueConstraint("course_id", "student_id", name="uq_course_student"),
    )

    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Kurs ID'si"
    )

    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Öğrenci ID'si"
    )

    # İlişkiler
    course = relationship("Course", back_populates="enrollments", lazy="select")
    student = relationship("User", foreign_keys=[student_id], lazy="select")

    def __repr__(self):
        return f"<CourseEnrollment(course={self.course_id}, student={self.student_id})>"
