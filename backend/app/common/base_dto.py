"""
Base DTO (Data Transfer Object) modülü.

API request/response şemalarının ortak base sınıflarını tanımlar.
Tüm feature DTO'ları bu sınıflardan türer.
Pydantic v2 kullanılır — tip güvenliği ve otomatik validasyon sağlar.
"""

from uuid import UUID
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field


# Generic tip: PaginatedResponse'da kullanılacak
T = TypeVar("T")


class BaseResponse(BaseModel):
    """
    Tüm response DTO'larının base sınıfı.
    Her response'ta id ve tarih alanları bulunur.

    Kullanım:
        class UserResponse(BaseResponse):
            email: str
            name: str
    """
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,  # SQLAlchemy model → Pydantic model dönüşümünü aktifleştirir
    }


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Sayfalanmış liste response'ları için generic şema.
    Herhangi bir response tipi ile kullanılabilir.

    Kullanım:
        PaginatedResponse[UserResponse] → sayfalanmış kullanıcı listesi
        PaginatedResponse[ProjectResponse] → sayfalanmış proje listesi

    Response örneği:
    {
        "items": [...],
        "total": 100,
        "page": 1,
        "size": 20,
        "pages": 5
    }
    """
    items: list[T] = Field(description="Mevcut sayfadaki kayıtlar")
    total: int = Field(description="Toplam kayıt sayısı")
    page: int = Field(description="Mevcut sayfa numarası")
    size: int = Field(description="Sayfa başına kayıt sayısı")
    pages: int = Field(description="Toplam sayfa sayısı")


class MessageResponse(BaseModel):
    """
    Basit mesaj response'ları için şema.
    Silme, güncelleme gibi işlemlerde kullanılır.

    Response örneği:
    {"message": "Kayıt başarıyla silindi"}
    """
    message: str


class FilterParams(BaseModel):
    """
    Liste endpoint'lerinde filtreleme, sıralama ve sayfalama parametreleri.

    Kullanım:
        @router.get("/users")
        def list_users(filters: FilterParams = Depends()):
            ...

    Parametreler:
    - page: Sayfa numarası (1'den başlar)
    - size: Sayfa başına kayıt sayısı (maks. 100)
    - sort_by: Sıralama alanı (örn: "created_at", "name")
    - order: Sıralama yönü ("asc" veya "desc")
    - search: Arama terimi (opsiyonel)
    """
    page: int = Field(default=1, ge=1, description="Sayfa numarası")
    size: int = Field(default=20, ge=1, le=100, description="Sayfa başına kayıt sayısı")
    sort_by: str = Field(default="created_at", description="Sıralama alanı")
    order: str = Field(default="desc", pattern="^(asc|desc)$", description="Sıralama yönü")
    search: str | None = Field(default=None, description="Arama terimi")
