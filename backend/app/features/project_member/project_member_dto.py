"""
Project Member DTO (Data Transfer Object) modülü.

Davet, katılım isteği, kabul/red, devir ve listeleme için request/response şemaları.
"""

from uuid import UUID
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.base.base_dto import BaseResponse
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
    name: Optional[str] = None
    email: str
    student_no: Optional[str] = None
    grade_label: Optional[str] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _ensure_name(cls, obj):
        """User.name boşsa first_name + last_name'den üret (ORM instance veya dict)."""
        if obj is None:
            return obj

        def _get(o, key):
            return o.get(key) if isinstance(o, dict) else getattr(o, key, None)

        name = _get(obj, "name")
        if name:
            return obj

        full = f"{_get(obj, 'first_name') or ''} {_get(obj, 'last_name') or ''}".strip()
        if not full:
            full = _get(obj, "email") or ""

        if isinstance(obj, dict):
            obj["name"] = full
            return obj
        # ORM nesnesi → dict'e dönüştür (from_attributes bypass)
        return {
            "id": _get(obj, "id"),
            "name": full,
            "email": _get(obj, "email"),
            "student_no": _get(obj, "student_no"),
            "grade_label": _get(obj, "grade_label"),
        }


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


class MyInvitationResponse(BaseResponse):
    """
    Kullanıcının kendisine gelen davetler için response.
    Üyelik kaydı + proje özet bilgisi içerir.
    """
    project_id: UUID
    status: MemberStatus
    invited_by: Optional[UUID] = None
    project_title: str
    project_description: Optional[str] = None
    project_status: Optional[str] = None
    invited_by_name: Optional[str] = None

    model_config = {"from_attributes": True}
