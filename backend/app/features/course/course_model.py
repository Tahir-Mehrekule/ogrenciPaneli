"""
Course (ders) veritabanı modeli.

Öğretmenlerin oluşturduğu dersleri temsil eder.
Projeler bir derse bağlanır; öğrenci görünürlüğü bölüm eşleşmesi ile otomatik sağlanır.
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.base.base_model import BaseModel
from app.common.enums import ProjectType


class Course(BaseModel):
    """
    Ders tablosu (courses).

    Alanlar:
    - name: Ders adı (örn: "Yazılım Mühendisliği")
    - code: Ders kodu, unique (örn: "CENG314")
    - semester: Dönem bilgisi (örn: "2025-2026 Güz")
    - teacher_id: Dersin öğretmeni (FK → users.id)
    - department_id: Dersin ait olduğu bölüm (FK → departments.id)
    - project_type: Bu derse açılacak projelerin tipi (bireysel / ekip / her ikisi)

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

    department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Dersin bölümü — zorunlu. Öğrenciler bölüm eşleşmesi ile dersi otomatik görür."
    )

    grade_level = Column(
        String(50),
        nullable=True,
        comment="Sınıf/yıl bilgisi (örn: '2. Sınıf'). Öğretmen ders açarken belirtir."
    )

    branch = Column(
        String(50),
        nullable=True,
        comment="Şube bilgisi (örn: 'A Şubesi'). Aynı dersin birden fazla şubesini ayırt eder."
    )

    require_youtube = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Haftalık raporda YouTube video zorunlu mu"
    )

    require_file = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Haftalık raporda dosya ekleme zorunlu mu"
    )

    project_type = Column(
        Enum(
            ProjectType,
            name="project_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=ProjectType.BOTH,
        server_default="both",
        comment="Bu derse açılabilecek proje tipi: bireysel / ekip / her ikisi"
    )

    # İlişkiler
    teacher    = relationship("User",       foreign_keys=[teacher_id],    lazy="select")
    department = relationship("Department", foreign_keys=[department_id], lazy="select")

    def __repr__(self):
        return f"<Course(id={self.id}, code={self.code}, name={self.name})>"


class CourseEnrollment(BaseModel):
    """
    Öğrenci - Ders kayıt eşleşme tablosu (course_enrollments).
    
    Hangi öğrencinin hangi derse kayıtlı olduğunu tutar.
    """

    __tablename__ = "course_enrollments"

    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Ders ID"
    )

    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Öğrenci ID"
    )

    # İlişkiler
    course = relationship("Course", lazy="select")
    student = relationship("User", foreign_keys=[student_id], lazy="select")

    def __repr__(self):
        return f"<CourseEnrollment(id={self.id}, course_id={self.course_id}, student_id={self.student_id})>"
