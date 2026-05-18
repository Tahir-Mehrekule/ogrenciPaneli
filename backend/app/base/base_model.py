"""
Base model modülü.

Tüm SQLAlchemy modellerinin türeyeceği base sınıf.
Ortak alanlar: id, name, short_name, description, tags,
               created_at, updated_at, is_active, is_deleted.

Child model aynı sütunu tekrar tanımlarsa (ör. Department.name → unique=True)
override eder; BaseModel'deki tanım o tablo için geçersiz olur.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class BaseModel(Base):
    """
    Tüm modellerin türeyeceği abstract base sınıf.

    Ortak alanlar:
    - id: UUID primary key
    - name: Kayıt adı (nullable — child override edebilir)
    - short_name: Kısa ad / kod (nullable)
    - description: Detaylı açıklama (nullable — child override edebilir)
    - tags: Etiketler (JSONB dizisi, nullable)
    - created_at, updated_at: Zaman damgaları
    - is_active: Soft disable
    - is_deleted: Soft delete
    """

    __abstract__ = True

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        comment="Benzersiz kayıt kimliği (UUID)",
    )

    name = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Kayıt adı",
    )

    short_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Kısa ad veya kod",
    )

    description = Column(
        Text,
        nullable=True,
        comment="Detaylı açıklama",
    )

    tags = Column(
        JSONB,
        nullable=True,
        default=list,
        comment="Etiketler (JSON dizisi)",
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
