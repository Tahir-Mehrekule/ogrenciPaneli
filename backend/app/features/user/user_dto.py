"""
User DTO (Data Transfer Object) modülü.

Kullanıcı yönetimi için request/response şemalarını tanımlar.
Admin panelinde kullanıcıları listeleme, güncelleme ve filtreleme işlemleri için kullanılır.
"""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.common.enums import UserRole, ApprovalStatus
from app.common.base_dto import FilterParams, BaseResponse
from app.features.auth.auth_dto import DepartmentInfo


class UserListResponse(BaseResponse):
    """
    Kullanıcı liste/detay response'u.

    BaseResponse'tan miras alınan alanlar: id, created_at, updated_at.
    Şifre (password_hash) ASLA response'ta gönderilmez.
    """
    email: str
    first_name: str
    last_name: str
    full_name: str
    role: UserRole
    departments: list[DepartmentInfo] = []
    student_no: Optional[str] = None
    grade_label: Optional[str] = None
    entry_year: Optional[int] = None
    approval_status: ApprovalStatus = ApprovalStatus.APPROVED
    is_active: bool


class UserUpdateRequest(BaseModel):
    """
    Kullanıcı güncelleme isteği (PATCH — kısmi güncelleme).

    Tüm alanlar opsiyonel — sadece gönderilen alanlar güncellenir.
    department_ids gönderilirse mevcut bölümler silinip yenileri eklenir.
    """
    first_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
        description="Ad"
    )
    last_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
        description="Soyad"
    )
    role: Optional[UserRole] = Field(
        default=None,
        description="Kullanıcı rolü (sadece ADMIN değiştirebilir)"
    )
    department_ids: Optional[list[str]] = Field(
        default=None,
        description="Yeni bölüm ID listesi — gönderilirse mevcut bölümler tamamen değiştirilir"
    )


class UpdateStudentInfoRequest(BaseModel):
    """
    Öğrenci numarası ve sınıf bilgisi güncelleme.

    TEACHER veya ADMIN tarafından yapılabilir.
    - Yeni student_no başka bir kullanıcıda kayıtlıysa 409 döner.
    - student_no verilirse prefix tablosundan grade_label + entry_year otomatik güncellenir.
    - grade_label / entry_year açıkça verilirse prefix'ten gelen değeri override eder.
    """
    student_no: Optional[str] = Field(
        default=None,
        min_length=9,
        max_length=9,
        pattern=r"^\d{9}$",
        description="Yeni öğrenci numarası (9 haneli rakam)"
    )
    grade_label: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Sınıf etiketi (ör: '2. Sınıf') — prefix'ten otomatik gelir, override için gönder"
    )
    entry_year: Optional[int] = Field(
        default=None,
        ge=2000,
        le=2100,
        description="Giriş yılı — prefix'ten otomatik gelir, override için gönder"
    )


class UserFilterParams(FilterParams):
    """
    Kullanıcı listesi filtreleme parametreleri.

    FilterParams'tan miras alınan alanlar: page, size, sort_by, order, search.

    Ek filtreler:
    - role: Belirli bir role göre filtrele
    - department_id: Belirli bir bölüme göre filtrele (UUID)
    - is_active: Aktif/pasif kullanıcıları filtrele
    - grade_label: Sınıf etiketi filtresi
    - student_no: Öğrenci numarası filtresi
    """
    role: Optional[UserRole] = Field(
        default=None,
        description="Rol filtresi (student, teacher, admin)"
    )
    department_id: Optional[UUID] = Field(
        default=None,
        description="Bölüm ID filtresi"
    )
    is_active: Optional[bool] = Field(
        default=True,
        description="Aktif/pasif filtresi (varsayılan: sadece aktifler)"
    )
    grade_label: Optional[str] = Field(
        default=None,
        description="Sınıf etiketi filtresi (ör: '2. Sınıf')"
    )
    student_no: Optional[str] = Field(
        default=None,
        description="Öğrenci numarası filtresi (kısmi eşleşme)"
    )
