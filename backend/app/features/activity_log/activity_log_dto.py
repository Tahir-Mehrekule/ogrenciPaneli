"""
ActivityLog DTO (Data Transfer Object) modülü.
"""

from uuid import UUID
from typing import Optional

from pydantic import Field

from app.common.enums import ActivityAction, EntityType
from app.common.base_dto import BaseResponse, FilterParams


class ActivityLogResponse(BaseResponse):
    """Aktivite log response'u."""
    user_id: Optional[UUID] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    action: ActivityAction
    entity_type: Optional[EntityType] = None
    entity_id: Optional[UUID] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None


class ActivityLogFilterParams(FilterParams):
    """Aktivite log listesi filtreleme parametreleri."""
    action: Optional[ActivityAction] = Field(default=None, description="Aksiyon filtresi")
    entity_type: Optional[EntityType] = Field(default=None, description="Varlık tipi filtresi")
    user_id: Optional[UUID] = Field(default=None, description="Kullanıcı filtresi")
