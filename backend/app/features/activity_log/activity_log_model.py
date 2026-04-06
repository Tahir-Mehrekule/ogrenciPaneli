"""
ActivityLog (aktivite log) veritabanı modeli.

Sistemdeki önemli aksiyonları izler: giriş, kayıt, proje onay/red, rapor teslim vb.
"""

from sqlalchemy import Column, String, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel
from app.common.enums import ActivityAction, EntityType


class ActivityLog(BaseModel):
    """
    Aktivite log tablosu (activity_logs).

    Alanlar:
    - user_id: İşlemi yapan kullanıcı (nullable — sistem aksiyonları için)
    - action: Yapılan aksiyon türü (ActivityAction enum)
    - entity_type: İşlemin ilgili olduğu varlık tipi
    - entity_id: İşlemin ilgili olduğu varlığın ID'si
    - details: Ek bilgi (JSON)
    - ip_address: Kullanıcının IP adresi
    """

    __tablename__ = "activity_logs"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="İşlemi yapan kullanıcı"
    )

    action = Column(
        Enum(ActivityAction, name="activity_action"),
        nullable=False,
        index=True,
        comment="Yapılan aksiyon"
    )

    entity_type = Column(
        Enum(EntityType, name="entity_type"),
        nullable=True,
        index=True,
        comment="İlgili varlık tipi"
    )

    entity_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="İlgili varlığın ID'si"
    )

    details = Column(
        JSONB,
        nullable=True,
        comment="Ek detay bilgisi (JSON)"
    )

    ip_address = Column(
        String(50),
        nullable=True,
        comment="Kullanıcı IP adresi"
    )

    # İlişki
    user = relationship("User", foreign_keys=[user_id], lazy="select")

    def __repr__(self):
        return f"<ActivityLog(action={self.action}, user={self.user_id}, entity={self.entity_type})>"
