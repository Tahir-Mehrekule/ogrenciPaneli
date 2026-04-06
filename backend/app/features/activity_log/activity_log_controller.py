"""
ActivityLog controller (API endpoint) modülü.

Sadece ADMIN rolü erişebilir.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import role_required
from app.common.enums import UserRole
from app.common.base_dto import PaginatedResponse
from app.features.activity_log.activity_log_service import ActivityLogService
from app.features.activity_log.activity_log_dto import ActivityLogFilterParams


router = APIRouter(
    prefix="/api/v1/admin/activity-logs",
    tags=["Admin"],
)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Sistem aktivite logları",
)
def list_activity_logs(
    params: ActivityLogFilterParams = Depends(),
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Sistem aktivite loglarını listeler. Sadece ADMIN erişebilir."""
    return ActivityLogService(db).list_logs(params)
