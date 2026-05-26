"""
Project DTO (Data Transfer Object) modülü.

Proje oluşturma, güncelleme, listeleme için request/response şemalarını tanımlar.
"""

import re
from uuid import UUID
from typing import Optional, Any

from pydantic import BaseModel, Field, field_validator

from app.common.enums import ProjectStatus, ProjectType
from app.base.base_dto import BaseResponse, FilterParams

_GITHUB_URL_RE = re.compile(r"^https?://github\.com/.+", re.IGNORECASE)


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
    github_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="GitHub repo URL (opsiyonel)"
    )

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v):
        if v is not None and not _GITHUB_URL_RE.match(v):
            raise ValueError("Geçersiz GitHub URL. Format: https://github.com/kullanici/repo")
        return v


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
    github_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="GitHub repo URL (opsiyonel)"
    )

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v):
        if v is not None and not _GITHUB_URL_RE.match(v):
            raise ValueError("Geçersiz GitHub URL. Format: https://github.com/kullanici/repo")
        return v


class ProjectRejectRequest(BaseModel):
    """Proje reddetme isteği — sebep zorunlu (min 10 karakter)."""
    reason: str = Field(
        min_length=10,
        max_length=2000,
        description="Reddetme sebebi"
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
    department_id: Optional[UUID] = None
    status: ProjectStatus
    created_by: UUID
    created_by_name: Optional[str] = None
    project_type: Optional[ProjectType] = None
    ai_task_plan: Optional[Any] = None
    is_active: bool
    github_url: Optional[str] = None
    rejection_reason: Optional[str] = None


class ProjectFilterParams(FilterParams):
    """
    Proje listesi filtreleme parametreleri.
    FilterParams'tan: page, size, sort_by, order, search
    """
    status: Optional[ProjectStatus] = Field(
        default=None,
        description="Durum filtresi"
    )
    exclude_status: Optional[ProjectStatus] = Field(
        default=None,
        description="Bu statusü hariç tut (örn: DRAFT)"
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
    student_search: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Öğrenci adı/email ile arama (User tablosuna JOIN)"
    )
    branch_code: Optional[str] = Field(
        default=None,
        max_length=10,
        description="Şube filtresi (User.class_section → branch_code)",
    )
