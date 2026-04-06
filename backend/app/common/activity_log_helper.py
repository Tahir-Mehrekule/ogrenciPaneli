"""
Aktivite log yardımcı fonksiyonu.

notification_helper.py ile aynı pattern'i izler.
Sistemdeki önemli aksiyonları veritabanına loglar.
"""

from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session

from app.features.activity_log.activity_log_model import ActivityLog
from app.common.enums import ActivityAction, EntityType


def log_activity(
    db: Session,
    action: ActivityAction,
    user_id: Optional[UUID] = None,
    entity_type: Optional[EntityType] = None,
    entity_id: Optional[UUID] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Sisteme bir aktivite logu kaydeder.

    Args:
        db: Veritabanı oturumu
        action: Yapılan aksiyon (ActivityAction enum)
        user_id: İşlemi yapan kullanıcının ID'si (opsiyonel)
        entity_type: İlgili varlık tipi (opsiyonel)
        entity_id: İlgili varlığın ID'si (opsiyonel)
        details: Ek detay bilgisi (JSON sözlüğü, opsiyonel)
        ip_address: Kullanıcının IP adresi (opsiyonel)
    """
    try:
        log = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(log)
        db.commit()
    except Exception:
        # Log kaydı başarısız olursa ana işlemi engelleme
        db.rollback()
