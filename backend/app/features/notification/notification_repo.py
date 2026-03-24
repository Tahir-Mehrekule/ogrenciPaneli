"""
Notification repository modülü.

Bildirim okuma, listeleme işlemleri.
"""

from uuid import UUID

from sqlalchemy import desc, asc
from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.features.notification.notification_model import Notification
from app.features.notification.notification_dto import NotificationFilterParams


class NotificationRepo(BaseRepository[Notification]):
    """Bildirim veritabanı operasyonları."""

    def __init__(self, db: Session):
        super().__init__(Notification, db)


    def get_unread_count(self, user_id: UUID) -> int:
        """Kullanıcının okunmamış bildirim sayısını döner."""
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
                Notification.is_active == True
            )
            .count()
        )

    def mark_all_as_read(self, user_id: UUID) -> int:
        """Kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretler."""
        updated_count = (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
                Notification.is_active == True
            )
            .update({"is_read": True}, synchronize_session=False)
        )
        self.db.commit()
        return updated_count

    def get_by_id_and_user(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        """ID ve kullanıcıya ait bildirimi getirir."""
        return (
            self.db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
                Notification.is_active == True
            )
            .first()
        )
