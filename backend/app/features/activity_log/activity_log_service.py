"""
ActivityLog service (iş mantığı) modülü.
"""

import math

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.features.activity_log.activity_log_repo import ActivityLogRepo
from app.features.activity_log.activity_log_dto import ActivityLogResponse, ActivityLogFilterParams


class ActivityLogService:
    """Aktivite log yönetimi servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ActivityLogRepo(db)

    def list_logs(self, params: ActivityLogFilterParams) -> PaginatedResponse:
        """Filtreli aktivite log listesi (sadece ADMIN)."""
        filters = {}
        if params.action:
            filters["action"] = params.action
        if params.entity_type:
            filters["entity_type"] = params.entity_type
        if params.user_id:
            filters["user_id"] = params.user_id

        logs, total = self.repo.get_many(
            filters=filters,
            search=params.search,
            search_fields=["ip_address"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by or "created_at",
            order=params.order or "desc",
        )

        items = [self._to_response(log) for log in logs]

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def _to_response(self, log) -> ActivityLogResponse:
        """Log nesnesini response DTO'ya dönüştürür ve kullanıcı bilgisiyle zenginleştirir."""
        response = ActivityLogResponse.model_validate(log)
        if log.user:
            response.user_name = log.user.name
            response.user_email = log.user.email
        return response
