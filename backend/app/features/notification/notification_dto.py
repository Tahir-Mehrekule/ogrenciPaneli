"""
Notification DTO modülü.

Bildirim listeleme, filreleme ve yanıt şemaları.
"""

from uuid import UUID
from typing import Optional

from pydantic import Field

from app.common.base_dto import BaseResponse, FilterParams
from app.common.enums import NotificationType


class NotificationResponse(BaseResponse):
    """Bildirim response objesi."""
    user_id: UUID
    type: NotificationType
    title: str
    message: str
    is_read: bool
    related_id: Optional[UUID]


class NotificationFilterParams(FilterParams):
    """Bildirim listesi filtreleri."""
    unread_only: bool = Field(
        default=False,
        description="Sadece okunmamış bildirimleri getir"
    )
    type: Optional[NotificationType] = Field(
        default=None,
        description="Belirli bir tipteki bildirimleri getir"
    )
