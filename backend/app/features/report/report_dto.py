"""
Report DTO (Data Transfer Object) modülü.

Haftalık rapor oluşturma, güncelleme ve inceleme için şemalar.
"""

from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field

from app.common.enums import ReportStatus
from app.common.base_dto import BaseResponse, FilterParams


class ReportCreate(BaseModel):
    """
    Rapor oluşturma isteği.
    week_number ve year otomatik hesaplanır — frontend göndermez.
    """
    project_id: UUID = Field(description="Rapor hangi projeye ait")
    content: str = Field(min_length=20, description="Rapor içeriği (min 20 karakter)")
    youtube_url: Optional[str] = Field(
        default=None, max_length=500, description="Video rapor YouTube linki"
    )


class ReportUpdate(BaseModel):
    """
    Rapor güncelleme isteği (PATCH). Sadece DRAFT raporlar güncellenebilir.
    """
    content: Optional[str] = Field(default=None, min_length=20)
    youtube_url: Optional[str] = Field(default=None, max_length=500)


class ReviewRequest(BaseModel):
    """
    Rapor inceleme isteği. Sadece TEACHER/ADMIN kullanabilir.
    """
    reviewer_note: str = Field(
        min_length=5,
        description="Öğretmenin geri bildirimi (zorunlu)"
    )


class ReportResponse(BaseResponse):
    """
    Rapor response'u. BaseResponse'tan: id, created_at, updated_at.
    """
    project_id: UUID
    submitted_by: UUID
    week_number: int
    year: int
    content: str
    youtube_url: Optional[str] = None
    status: ReportStatus
    reviewer_note: Optional[str] = None
    is_active: bool


class ReportFilterParams(FilterParams):
    """
    Rapor listesi filtreleme parametreleri.
    """
    project_id: Optional[UUID] = Field(default=None, description="Proje filtresi")
    submitted_by: Optional[UUID] = Field(default=None, description="Raporlayan kullanıcı filtresi")
    status: Optional[ReportStatus] = Field(default=None, description="Durum filtresi")
    week_number: Optional[int] = Field(default=None, ge=1, le=53, description="Hafta numarası filtresi")
    year: Optional[int] = Field(default=None, description="Yıl filtresi")
