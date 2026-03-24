"""
Notification (Bildirim) veritabanı modeli.

Kullanıcılara gönderilen sistem bildirimlerini (proje onayı, görev ataması vb.) temsil eder.
"""

from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.base.base_model import BaseModel
from app.common.enums import NotificationType


class Notification(BaseModel):
    """
    Bildirim tablosu (notifications).

    Alanlar:
    - user_id: Bildirimin gönderildiği kullanıcı (FK → users.id)
    - type: Bildirim tipi (NotificationType)
    - title: Bildirim başlığı
    - message: Bildirim içeriği
    - is_read: Okundu durumu (varsayılan: False)
    - related_id: İlgili nesnenin ID'si (ör. proje, görev, rapor vb.) opsiyonel.

    BaseModel'den miras: id, created_at, updated_at, is_active
    """

    __tablename__ = "notifications"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Bildirimin alıcısı"
    )

    type = Column(
        Enum(NotificationType, name="notification_type"),
        nullable=False,
        index=True,
        comment="Bildirim tipi"
    )

    title = Column(
        String(255),
        nullable=False,
        comment="Bildirim başlığı"
    )

    message = Column(
        Text,
        nullable=False,
        comment="Bildirim içeriği"
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="Okundu mu?"
    )

    related_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="İlgili nesnenin (Proje, Görev vs.) ID'si"
    )

    # İlişkiler
    user = relationship("User", foreign_keys=[user_id], lazy="select")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, is_read={self.is_read})>"
