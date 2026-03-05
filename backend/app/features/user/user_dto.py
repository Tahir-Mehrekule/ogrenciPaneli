"""
User DTO (Data Transfer Object) modülü.

Kullanıcı yönetimi için request/response şemalarını tanımlar.
Admin panelinde kullanıcıları listeleme, güncelleme ve filtreleme işlemleri için kullanılır.
"""

from typing import Optional
from pydantic import BaseModel, Field

from app.common.enums import UserRole
from app.common.base_dto import FilterParams, BaseResponse


class UserListResponse(BaseResponse):
    """
    Kullanıcı liste/detay response'u.

    BaseResponse'tan miras alınan alanlar: id, created_at, updated_at.
    Şifre (password_hash) ASLA response'ta gönderilmez.
    """
    email: str
    name: str
    role: UserRole
    department: Optional[str] = None
    is_active: bool


class UserUpdateRequest(BaseModel):
    """
    Kullanıcı güncelleme isteği (PATCH — kısmi güncelleme).

    Tüm alanlar opsiyonel — sadece gönderilen alanlar güncellenir.

    Örnek:
        {"name": "Yeni Ad"} → sadece isim güncellenir
        {"role": "teacher"} → sadece rol güncellenir (ADMIN yetkisi gerekli)
    """
    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
        description="Ad soyad"
    )
    role: Optional[UserRole] = Field(
        default=None,
        description="Kullanıcı rolü (sadece ADMIN değiştirebilir)"
    )
    department: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Bölüm adı"
    )


class UserFilterParams(FilterParams):
    """
    Kullanıcı listesi filtreleme parametreleri.

    FilterParams'tan miras alınan alanlar: page, size, sort_by, order, search.

    Ek filtreler:
    - role: Belirli bir role göre filtrele
    - department: Belirli bir bölüme göre filtrele
    - is_active: Aktif/pasif kullanıcıları filtrele
    """
    role: Optional[UserRole] = Field(
        default=None,
        description="Rol filtresi (student, teacher, admin)"
    )
    department: Optional[str] = Field(
        default=None,
        description="Bölüm filtresi"
    )
    is_active: Optional[bool] = Field(
        default=True,
        description="Aktif/pasif filtresi (varsayılan: sadece aktifler)"
    )
