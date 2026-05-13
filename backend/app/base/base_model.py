"""
Base model modülü.

Tüm SQLAlchemy modellerinin türeyeceği minimal base sınıf.
Ortak alanlar: id, created_at, updated_at, is_active, is_deleted.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class BaseModel(Base):
    """
    Tüm modellerin türeyeceği abstract base sınıf.

    Alanlar:
    - id: UUID primary key
    - created_at: Oluşturma tarihi (otomatik)
    - updated_at: Son güncelleme tarihi (otomatik)
    - is_active: Aktif/pasif durumu — soft disable için (True=aktif)
    - is_deleted: Soft delete flag — geri dönüşümlü silme için (False=mevcut)

    is_active vs is_deleted farkı:
    - is_active=False → öğretmen pasifleştirir, kayıt hâlâ erişilebilir
    - is_deleted=True → admin hard-delete öncesi işaretler (veya soft delete)
    """

    __abstract__ = True

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        comment="Benzersiz kayıt kimliği (UUID)",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Kayıt oluşturma tarihi",
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Son güncelleme tarihi",
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Aktiflik durumu: True=aktif, False=pasif (öğretmen soft-disable)",
    )

    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        comment="Soft delete: False=mevcut, True=silinmiş (admin hard-delete öncesi)",
    )
