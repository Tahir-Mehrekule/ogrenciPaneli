"""
Project DTO (Data Transfer Object) modülü.

Proje oluşturma, güncelleme, listeleme için request/response şemalarını tanımlar.
"""

from uuid import UUID
from typing import Optional, Any

from pydantic import BaseModel, Field

from app.common.enums import ProjectStatus
from app.common.base_dto import BaseResponse, FilterParams


class ProjectCreate(BaseModel):
    """
    Proje oluşturma isteği.

    Yeni proje DRAFT statüsünde oluşturulur.
    course_id Faz 2'de zorunlu olacak, şimdilik opsiyonel.
    """
    title: str = Field(
        min_length=3,
        max_length=200,
        description="Proje başlığı"
    )
    description: str = Field(
        min_length=10,
        description="Proje açıklaması"
    )
    course_id: Optional[UUID] = Field(
        default=None,
        description="Ders ID'si (Faz 2'de zorunlu)"
    )


class ProjectUpdate(BaseModel):
    """
    Proje güncelleme isteği (PATCH — kısmi güncelleme).
    Sadece DRAFT statüsündeki projeler güncellenebilir.
    """
    title: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=200,
        description="Proje başlığı"
    )
    description: Optional[str] = Field(
        default=None,
        min_length=10,
        description="Proje açıklaması"
    )


class ProjectResponse(BaseResponse):
    """
    Proje detay/liste response'u.
    BaseResponse'tan: id, created_at, updated_at
    """
    title: str
    description: str
    course_id: Optional[UUID] = None
    status: ProjectStatus
    created_by: UUID
    ai_task_plan: Optional[Any] = None
    is_active: bool
    # Ders bilgisi (course relationship üzerinden zenginleştirilir)
    course_name: Optional[str] = None
    course_code: Optional[str] = None


class ProjectFilterParams(FilterParams):
    """
    Proje listesi filtreleme parametreleri.
    FilterParams'tan: page, size, sort_by, order, search
    """
    status: Optional[ProjectStatus] = Field(
        default=None,
        description="Durum filtresi"
    )
    created_by: Optional[UUID] = Field(
        default=None,
        description="Oluşturan kullanıcı filtresi"
    )
