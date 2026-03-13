"""
Base model (temel model) modülü.

Tüm SQLAlchemy modellerinin türeyeceği base sınıfı tanımlar.
Ortak alanlar: id, created_at, updated_at, is_active.
Bu sayede her modelde bu alanları tekrar yazmaya gerek kalmaz (DRY).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class BaseModel(Base):
    """
    Tüm modellerin türeyeceği abstract base sınıf.

    Ortak alanlar:
    - id: UUID primary key (otomatik üretilir)
    - created_at: Kayıt oluşturma tarihi (otomatik set edilir)
    - updated_at: Son güncelleme tarihi (her update'te otomatik değişir)
    - is_active: Soft delete flag'i (True=aktif, False=silinmiş)

    Not: __abstract__ = True olduğu için bu sınıf kendi başına tablo oluşturmaz.
    Sadece diğer modellerin ortak alanlarını miras almasını sağlar.
    """

    __abstract__ = True  # Bu sınıf için ayrı tablo oluşturulmaz

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        comment="Benzersiz kayıt kimliği (UUID)"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Kayıt oluşturma tarihi"
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Son güncelleme tarihi"
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Soft delete: True=aktif, False=silinmiş"
    )
