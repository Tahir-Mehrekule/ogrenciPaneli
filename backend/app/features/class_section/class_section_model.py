"""
ClassSection (şube) veritabanı modeli.

Bir bölümün belirli bir sınıf/yıl içindeki şubesini temsil eder.
Örnek: Bilgisayar Mühendisliği · 2. Sınıf · A Şubesi.

Composite unique: (department_id, grade_label, branch_code).
"""

from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.base.base_model import BaseModel


class ClassSection(BaseModel):
    """
    Sınıf-şube tablosu (class_sections).

    Alanlar:
    - department_id: Hangi bölüme ait (FK → departments.id)
    - grade_label: Sınıf etiketi (örn: "2. Sınıf")
    - branch_code: Şube kodu (örn: "A", "B")
    - capacity: Kontenjan (opsiyonel)

    BaseModel'den miras: id, created_at, updated_at, is_active, is_deleted
    """

    __tablename__ = "class_sections"

    department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Şubenin ait olduğu bölüm",
    )

    grade_label = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Sınıf etiketi (örn: '1. Sınıf', '2. Sınıf')",
    )

    branch_code = Column(
        String(10),
        nullable=False,
        comment="Şube kodu (örn: 'A', 'B', 'NÖ')",
    )

    capacity = Column(
        Integer,
        nullable=True,
        comment="Şube kontenjanı (opsiyonel)",
    )

    department = relationship("Department", lazy="select")

    __table_args__ = (
        UniqueConstraint(
            "department_id", "grade_label", "branch_code",
            name="uq_class_section_dept_grade_branch",
        ),
    )

    def __repr__(self):
        return (
            f"<ClassSection(id={self.id}, dept={self.department_id}, "
            f"grade={self.grade_label}, branch={self.branch_code})>"
        )
