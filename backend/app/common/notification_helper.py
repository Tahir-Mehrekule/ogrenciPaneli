"""
Bildirim yardımcı fonksiyonları (helpers).

Diğer feature'ların (Project, Task, Report vb.) kolayca bildirim oluşturabilmesi için 
ortak bir yardımcı modüldür. Bu dosya, dairesel bağımlılıkları (circular dependency) önler.
"""

from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.features.notification.notification_model import Notification
from app.common.enums import NotificationType


def send_notification(
    db: Session,
    user_id: UUID,
    type: NotificationType,
    title: str,
    message: str,
    related_id: Optional[UUID] = None
) -> Notification:
    """
    Belirtilen kullanıcıya yeni bir bildirim gönderir (veritabanına kaydeder).
    """
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_id=related_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
