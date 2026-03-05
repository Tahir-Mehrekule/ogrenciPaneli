"""
Task (görev) veritabanı modeli.

Projeler içindeki görevleri temsil eder.
Durum akışı: TODO → IN_PROGRESS → REVIEW → DONE
"""

from sqlalchemy import Column, String, Text, ForeignKey, Enum, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel
from app.common.enums import TaskStatus


class Task(BaseModel):
    """
    Görev tablosu (tasks).

    Alanlar:
    - title: Görev başlığı
    - description: Görev açıklaması
    - project_id: Ait olduğu proje
    - assigned_to: Atanan kullanıcı (opsiyonel)
    - status: Görev durumu (durum makinesine göre ilerler)
    - due_date: Teslim tarihi (opsiyonel)
    - ai_suggested: AI tarafından önerildi mi?

    BaseModel'den miras: id, created_at, updated_at, is_active
    """

    __tablename__ = "tasks"

    title = Column(
        String(200),
        nullable=False,
        comment="Görev başlığı"
    )

    description = Column(
        Text,
        nullable=False,
        comment="Görev açıklaması"
    )

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Ait olduğu proje"
    )

    assigned_to = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Görevi yapacak kullanıcı (opsiyonel)"
    )

    status = Column(
        Enum(TaskStatus, name="task_status"),
        nullable=False,
        default=TaskStatus.TODO,
        index=True,
        comment="Görev durumu"
    )

    due_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Teslim tarihi"
    )

    ai_suggested = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="AI tarafından önerildi mi?"
    )

    # İlişkiler
    project = relationship("Project", foreign_keys=[project_id], lazy="select")
    assignee = relationship("User", foreign_keys=[assigned_to], lazy="select")

    def __repr__(self):
        return f"<Task(id={self.id}, title={self.title}, status={self.status})>"
