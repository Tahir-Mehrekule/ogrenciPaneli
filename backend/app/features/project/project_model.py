"""
Project (proje) veritabanı modeli.

Öğrencilerin oluşturduğu projeleri temsil eder.
Durum akışı: DRAFT → PENDING → APPROVED/REJECTED → IN_PROGRESS → COMPLETED
"""

import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel
from app.common.enums import ProjectStatus


class Project(BaseModel):
    """
    Proje tablosu (projects).

    Alanlar:
    - title: Proje başlığı
    - description: Proje açıklaması
    - course_id: Ders ID'si (Faz 2'de aktif olacak, şimdi nullable)
    - status: Proje durumu (durum makinesine göre ilerler)
    - created_by: Projeyi oluşturan kullanıcı
    - ai_task_plan: AI'ın önerdiği görev planı (JSON, opsiyonel)

    BaseModel'den miras: id, created_at, updated_at, is_active
    """

    __tablename__ = "projects"

    title = Column(
        String(200),
        nullable=False,
        comment="Proje başlığı"
    )

    description = Column(
        Text,
        nullable=False,
        comment="Proje açıklaması"
    )

    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,       # Mevcut projeler için geriye dönük uyumluluk
        index=True,
        comment="Ders ID'si"
    )


    status = Column(
        Enum(ProjectStatus, name="project_status"),
        nullable=False,
        default=ProjectStatus.DRAFT,
        index=True,
        comment="Proje durumu"
    )

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Projeyi oluşturan kullanıcı"
    )

    ai_task_plan = Column(
        JSON,
        nullable=True,
        comment="AI önerisi (görev planı)"
    )

    # İlişkiler
    creator = relationship("User", foreign_keys=[created_by], lazy="select")

    def __repr__(self):
        return f"<Project(id={self.id}, title={self.title}, status={self.status})>"
