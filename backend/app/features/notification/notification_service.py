"""
Notification service (iş mantığı) modülü.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.exceptions import NotFoundException
from app.features.notification.notification_model import Notification
from app.features.notification.notification_repo import NotificationRepo
from app.features.notification.notification_dto import (
    NotificationResponse,
    NotificationFilterParams
)
from app.features.auth.auth_model import User


class NotificationService:
    """Bildirim iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepo(db)

    def list_notifications(
        self, params: NotificationFilterParams, current_user: User
    ) -> PaginatedResponse:
        """Kullanıcının bildirimlerini listeler."""
        filters = {"user_id": current_user.id}
        if params.unread_only:
            filters["is_read"] = False
        if params.type:
            filters["type"] = params.type

        notifications, total = self.repo.get_many(
            filters=filters,
            search=params.search,
            search_fields=["title", "message"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [NotificationResponse.model_validate(n) for n in notifications]

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_unread_count(self, current_user: User) -> dict:
        """Kullanıcının okunmamış bildirim sayısını getirir."""
        count = self.repo.get_unread_count(current_user.id)
        return {"unread_count": count}

    def mark_as_read(self, notification_id: UUID, current_user: User) -> NotificationResponse:
        """Tekil bildirimi okundu olarak işaretler."""
        notification = self.repo.get_by_id_and_user(notification_id, current_user.id)
        if not notification:
            raise NotFoundException("Bildirim bulunamadı veya size ait değil")

        if not notification.is_read:
            notification = self.repo.update(notification_id, {"is_read": True})

        return NotificationResponse.model_validate(notification)

    def mark_all_as_read(self, current_user: User) -> dict:
        """Kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretler."""
        updated_count = self.repo.mark_all_as_read(current_user.id)
        return {"message": f"{updated_count} bildirim okundu olarak işaretlendi"}

    def delete_notification(self, notification_id: UUID, current_user: User) -> dict:
        """Bildirimi soft_delete ile siler (gizler)."""
        notification = self.repo.get_by_id_and_user(notification_id, current_user.id)
        if not notification:
            raise NotFoundException("Bildirim bulunamadı veya size ait değil")

        self.repo.delete(notification_id)
        return {"message": "Bildirim başarıyla silindi"}
