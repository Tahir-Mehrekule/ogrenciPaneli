"""
Project Member DTO (Data Transfer Object) modülü.

Proje üyesi ekleme ve listeleme için request/response şemalarını tanımlar.
"""

from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field

from app.common.base_dto import BaseResponse


class AddMemberRequest(BaseModel):
    """
    Projeye üye ekleme isteği.

    role: "leader" veya "member" (varsayılan: "member")
    """
    user_id: UUID = Field(description="Eklenecek kullanıcının UUID'si")
    role: Optional[str] = Field(
        default="member",
        pattern="^(leader|member)$",
        description="Proje içi rol: leader veya member"
    )


class ProjectMemberResponse(BaseResponse):
    """
    Proje üyelik response'u.
    BaseResponse'tan: id, created_at, updated_at
    """
    project_id: UUID
    user_id: UUID
    role: str
    is_active: bool
