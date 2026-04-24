"""
Department DTO (Data Transfer Object) modülü.

Bölüm oluşturma, güncelleme ve listeleme için request/response şemaları.
"""

from typing import Optional
from pydantic import BaseModel, Field

from app.common.base_dto import BaseResponse


class DepartmentCreate(BaseModel):
    """Yeni bölüm oluşturma isteği."""

    name: str = Field(
        min_length=2,
        max_length=200,
        description="Bölüm adı (örn: 'Bilgisayar Mühendisliği')"
    )


class DepartmentUpdate(BaseModel):
    """Bölüm güncelleme isteği (kısmi güncelleme)."""

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=200,
        description="Yeni bölüm adı"
    )


class DepartmentResponse(BaseResponse):
    """Bölüm yanıt şeması."""

    name: str
