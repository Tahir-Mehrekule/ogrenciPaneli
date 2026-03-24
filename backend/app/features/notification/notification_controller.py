"""
Notification controller modülü (API endpoint'leri).
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.common.base_dto import PaginatedResponse, MessageResponse
from app.features.notification.notification_service import NotificationService
from app.features.notification.notification_dto import (
    NotificationResponse,
    NotificationFilterParams
)


router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Bildirimleri listele",
)
def list_notifications(
    params: NotificationFilterParams = Depends(),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Giriş yapan kullanıcının bildirimlerini listeler."""
    return NotificationService(db).list_notifications(params, current_user)


@router.get(
    "/unread-count",
    summary="Okunmamış bildirim sayısı",
)
def get_unread_count(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Okunmamış bildirim sayısını döner."""
    return NotificationService(db).get_unread_count(current_user)


@router.patch(
    "/read-all",
    summary="Tüm bildirimleri okundu işaretle",
)
def mark_all_as_read(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kullanıcının okunmamış tüm bildirimlerini okundu yapar."""
    return NotificationService(db).mark_all_as_read(current_user)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Bildirimi okundu işaretle",
)
def mark_as_read(
    notification_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ID'si verilen bildirimi okundu yapar."""
    return NotificationService(db).mark_as_read(notification_id, current_user)


@router.delete(
    "/{notification_id}",
    response_model=MessageResponse,
    summary="Bildirimi sil",
)
def delete_notification(
    notification_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bildirimi soft-delete tekniğiyle pasife alır."""
    return NotificationService(db).delete_notification(notification_id, current_user)
