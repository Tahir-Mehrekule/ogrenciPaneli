"""
StudentYearPrefix (öğrenci yılı prefix) veritabanı modeli.

Admin tarafından tanımlanan 6 haneli öğrenci numarası prefix'leri.
Öğrenci kayıt olduğunda student_no'nun ilk 6 hanesi bu tabloda aranır;
eşleşme bulunursa user.entry_year ve user.grade_label otomatik set edilir.

Örnek:
  prefix=245235 → entry_year=2024, label="2. Sınıf"
  prefix=255245 → entry_year=2025, label="1. Sınıf"
"""

from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel


class StudentYearPrefix(BaseModel):
    """
    Öğrenci numarası prefix tablosu (student_year_prefixes).

    Alanlar:
    - prefix: 6 haneli öğrenci no prefix'i (unique)
    - entry_year: Giriş yılı (ör: 2024)
    - label: Görünen sınıf etiketi (ör: "2. Sınıf")
    - created_by: Oluşturan admin
    """

    __tablename__ = "student_year_prefixes"

    prefix = Column(
        String(6),
        unique=True,
        nullable=False,
        index=True,
        comment="6 haneli öğrenci no prefix'i (ör: 245235)"
    )

    entry_year = Column(
        Integer,
        nullable=False,
        comment="Giriş yılı (ör: 2024)"
    )

    label = Column(
        String(50),
        nullable=False,
        comment="Görünen sınıf etiketi (ör: '2. Sınıf')"
    )

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Oluşturan admin"
    )

    # İlişkiler
    creator = relationship("User", foreign_keys=[created_by], lazy="select")

    def __repr__(self):
        return (
            f"<StudentYearPrefix(prefix={self.prefix}, "
            f"entry_year={self.entry_year}, label={self.label})>"
        )
