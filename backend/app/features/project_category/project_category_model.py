"""
ProjectCategory (proje kategorisi) veritabanı modeli.

Öğretmenler kendi derslerine bağlı kategoriler (bölümler) oluşturur.
Örnek: "2024 Girişli - 2. Sınıf Projeleri", "1. Sınıf Web Dersi"

Silme kuralı: İçinde aktif/taslak proje olan kategori silinemez.
Servis katmanı bu kontrolü yapar ve 409 döner.
"""

from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel


class ProjectCategory(BaseModel):
    """
    Proje kategorisi tablosu (project_categories).

    Alanlar:
    - name: Kategori adı (aynı ders içinde unique)
    - course_id: Hangi derse bağlı
    - created_by: Oluşturan öğretmen/admin
    - color: Opsiyonel UI renk etiketi (#hex)
    """

    __tablename__ = "project_categories"
    __table_args__ = (
        UniqueConstraint("course_id", "name", name="uq_category_course_name"),
    )

    name = Column(
        String(100),
        nullable=False,
        comment="Kategori adı (ör: '2. Sınıf Projeleri')"
    )

    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Bağlı ders — öğretmen sadece kendi dersine kategori ekleyebilir"
    )

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Oluşturan öğretmen veya admin"
    )

    color = Column(
        String(7),
        nullable=True,
        comment="UI renk etiketi (#rrggbb formatında, opsiyonel)"
    )

    # İlişkiler
    course = relationship("Course", foreign_keys=[course_id], lazy="select")
    creator = relationship("User", foreign_keys=[created_by], lazy="select")

    def __repr__(self):
        return f"<ProjectCategory(id={self.id}, name={self.name}, course={self.course_id})>"
