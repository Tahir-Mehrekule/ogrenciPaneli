"""
Base model (temel model) modülü.

Tüm SQLAlchemy modellerinin türeyeceği base sınıfı tanımlar.
Ortak alanlar: id, created_at, updated_at, is_active, is_deleted.
Bu sayede her modelde bu alanları tekrar yazmaya gerek kalmaz (DRY).

Ek olarak NamedBaseModel, isim/açıklama/etiket gerektiren modeller için
genişletilmiş base sınıf sağlar.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Boolean, DateTime, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class BaseModel(Base):
    """
    Tüm modellerin türeyeceği abstract base sınıf.

    Ortak alanlar:
    - id: UUID primary key (otomatik üretilir)
    - created_at: Kayıt oluşturma tarihi (otomatik set edilir)
    - updated_at: Son güncelleme tarihi (her update'te otomatik değişir)
    - is_active: Kaydın aktif/pasif durumu (True=aktif, False=pasif)
    - is_deleted: Soft delete flag'i (True=silinmiş, False=silinmemiş)

    is_active vs is_deleted farkı:
    - is_active: Bir kaydı geçici olarak devre dışı bırakmak için (örn: kullanıcı askıya alındı)
    - is_deleted: Kaydın silindiğini işaretler, geri dönüşümlü silme sağlar
    """

    __abstract__ = True

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
        comment="Aktiflik durumu: True=aktif, False=pasif (geçici devre dışı)"
    )

    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        comment="Soft delete: False=mevcut, True=silinmiş"
    )


class NamedBaseModel(BaseModel):
    """
    İsim, kısa ad, açıklama ve etiket gerektiren modeller için genişletilmiş base.

    BaseModel'deki tüm alanlara ek olarak:
    - ad: Kaydın tam adı/başlığı
    - kisa_ad: Kod adı veya kısaltma (opsiyonel)
    - aciklama: Detaylı açıklama (opsiyonel)
    - etiketler: JSON formatında etiket dizisi (opsiyonel)

    Bu sınıfı kullanan modeller: Project, Task, Course vb.
    Kullanmayan modeller (join table'lar, User, Report): düz BaseModel'den türer.
    """

    __abstract__ = True

    ad = Column(
        String(200),
        nullable=False,
        comment="Kaydın adı/başlığı"
    )

    kisa_ad = Column(
        String(50),
        nullable=True,
        comment="Kod adı veya kısaltma"
    )

    aciklama = Column(
        Text,
        nullable=True,
        comment="Detaylı açıklama"
    )

    etiketler = Column(
        JSON,
        nullable=True,
        default=list,
        comment="Etiketler (JSON dizisi, örn: ['python', 'web'])"
    )
