"""
Course DTO (Data Transfer Object) modülü.

Ders oluşturma, güncelleme ve listeleme için request/response şemaları.
Enrollment sistemi kaldırıldı — öğrenci görünürlüğü bölüm eşleşmesiyle otomatik sağlanır.
"""

from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field

from app.common.enums import ProjectType
from app.base.base_dto import BaseResponse, FilterParams


class CourseCreate(BaseModel):
    """Ders oluşturma isteği (TEACHER/ADMIN)."""
    name: str = Field(
        min_length=3,
        max_length=200,
        description="Ders adı",
        examples=["Yazılım Mühendisliği"],
    )
    code: str = Field(
        min_length=2,
        max_length=20,
        description="Ders kodu (benzersiz)",
        examples=["CENG314"],
    )
    semester: str = Field(
        min_length=3,
        max_length=50,
        description="Dönem bilgisi",
        examples=["2025-2026 Güz"],
    )
    department_id: UUID = Field(
        description="Dersin bölümü — bu bölümdeki öğrenciler dersi otomatik görür (zorunlu)",
    )
    teacher_id: Optional[UUID] = Field(
        default=None,
        description="Atanan öğretmen. ADMIN için zorunlu; boşsa current_user (eski davranış).",
    )
    project_type: ProjectType = Field(
        default=ProjectType.BOTH,
        description="Bu derse açılacak projelerin tipi (bireysel/ekip/her ikisi)",
    )
    require_youtube: bool = Field(
        default=False,
        description="Haftalık raporda YouTube video zorunlu mu",
    )
    require_file: bool = Field(
        default=False,
        description="Haftalık raporda dosya ekleme zorunlu mu",
    )


class CourseUpdate(BaseModel):
    """Ders güncelleme isteği (PATCH — kısmi güncelleme)."""
    name: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=200,
        description="Ders adı",
    )
    semester: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=50,
        description="Dönem bilgisi",
    )
    department_id: Optional[UUID] = Field(
        default=None,
        description="Dersin bölümü",
    )
    project_type: Optional[ProjectType] = Field(
        default=None,
        description="Proje tipi (bireysel / ekip / her ikisi)",
    )
    require_youtube: Optional[bool] = Field(
        default=None,
        description="Haftalık raporda YouTube video zorunlu mu",
    )
    require_file: Optional[bool] = Field(
        default=None,
        description="Haftalık raporda dosya ekleme zorunlu mu",
    )


class CourseResponse(BaseResponse):
    """
    Ders detay/liste response'u.
    BaseResponse'tan: id, created_at, updated_at
    """
    name: str
    code: str
    semester: str
    teacher_id: UUID
    teacher_name: str = ""
    department_id: UUID
    is_active: bool
    project_type: ProjectType = ProjectType.BOTH
    require_youtube: bool = False
    require_file: bool = False


class CourseFilterParams(FilterParams):
    """Ders listesi filtreleme parametreleri."""
    semester: Optional[str] = Field(
        default=None,
        description="Dönem filtresi",
    )
    teacher_id: Optional[UUID] = Field(
        default=None,
        description="Öğretmen filtresi",
    )
    department_id: Optional[UUID] = Field(
        default=None,
        description="Bölüm filtresi",
    )
