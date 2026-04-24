"""
Project Member DTO (Data Transfer Object) modülü.

Davet, katılım isteği, kabul/red, devir ve listeleme için request/response şemaları.
"""

from uuid import UUID
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field

from app.common.base_dto import BaseResponse
from app.common.enums import MemberRole, MemberStatus


# ── Request'ler ───────────────────────────────────────────────────────────────

class InviteMemberRequest(BaseModel):
    """Yöneticinin kullanıcıya davet göndermesi."""
    user_id: UUID = Field(description="Davet edilecek kullanıcı UUID'si")


class JoinRequestCreate(BaseModel):
    """Öğrencinin share_code ile projeye katılım isteği atması (body boş)."""
    pass


class TransferManagerRequest(BaseModel):
    """Yöneticilik devrinin yapılacağı yeni yönetici."""
    user_id: UUID = Field(description="Yöneticilik devredilecek mevcut ACTIVE üyenin UUID'si")


# ── Response'lar ──────────────────────────────────────────────────────────────

class MemberUserInfo(BaseModel):
    """Üyelik response'unda kullanıcı detayları."""
    id: UUID
    name: str
    email: str
    student_no: Optional[str] = None
    grade_label: Optional[str] = None

    model_config = {"from_attributes": True}


class ProjectMemberResponse(BaseResponse):
    """
    Proje üyelik response'u.
    BaseResponse'tan: id, created_at, updated_at
    """
    project_id: UUID
    user_id: UUID
    role: MemberRole
    status: MemberStatus
    invited_by: Optional[UUID] = None
    responded_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None
    user: Optional[MemberUserInfo] = None

    model_config = {"from_attributes": True}


class PendingMemberResponse(BaseResponse):
    """
    Bekleyen davet veya katılım isteği response'u.
    Yöneticinin onay listesinde gösterilir.
    """
    project_id: UUID
    user_id: UUID
    status: MemberStatus           # INVITED veya JOIN_REQUESTED
    invited_by: Optional[UUID] = None
    user: Optional[MemberUserInfo] = None

    model_config = {"from_attributes": True}
