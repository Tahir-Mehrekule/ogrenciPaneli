"""
Project DTO (Data Transfer Object) modülü.

Proje oluşturma, güncelleme, listeleme için request/response şemalarını tanımlar.
"""

from uuid import UUID
from typing import Optional, Any

from pydantic import BaseModel, Field

from app.common.enums import ProjectStatus, ProjectType
from app.base.base_dto import BaseResponse, FilterParams


class ProjectCreate(BaseModel):
    """
    Proje oluşturma isteği.

    Yeni proje DRAFT statüsünde oluşturulur.
    course_id zorunlu; project_type ders ayarından belirlenir veya kullanıcı seçer.
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
        description="Ders ID'si"
    )
    project_type: Optional[ProjectType] = Field(
        default=None,
        description="Proje tipi. Ders BOTH ise kullanıcı seçer; INDIVIDUAL/TEAM ise otomatik atanır."
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
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    status: ProjectStatus
    created_by: UUID
    created_by_name: Optional[str] = None
    project_type: Optional[ProjectType] = None
    ai_task_plan: Optional[Any] = None
    is_active: bool


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
        description="Oluşturan öğrenci UUID filtresi"
    )
    grade_label: Optional[str] = Field(
        default=None,
        description="Sınıf filtresi (örn: '2. Sınıf')"
    )
    course_id: Optional[UUID] = Field(
        default=None,
        description="Ders filtresi"
    )
