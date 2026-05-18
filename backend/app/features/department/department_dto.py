"""
Department DTO (Data Transfer Object) modülü.

Bölüm oluşturma, güncelleme ve listeleme için request/response şemaları.
"""

from typing import Optional
from pydantic import BaseModel, Field

from app.base.base_dto import BaseResponse


CODE_REGEX = r"^\d{3}$"


class DepartmentCreate(BaseModel):
    """Yeni bölüm oluşturma isteği."""

    name: str = Field(
        min_length=2,
        max_length=200,
        description="Bölüm adı (örn: 'Bilgisayar Mühendisliği')"
    )
    code: str = Field(
        pattern=CODE_REGEX,
        description="3 haneli bölüm kodu (örn: '235'). Öğrenci no formatında kullanılır."
    )


class DepartmentUpdate(BaseModel):
    """Bölüm güncelleme isteği (kısmi güncelleme)."""

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=200,
        description="Yeni bölüm adı"
    )
    code: Optional[str] = Field(
        default=None,
        pattern=CODE_REGEX,
        description="Yeni 3 haneli bölüm kodu"
    )


class DepartmentResponse(BaseResponse):
    """Bölüm yanıt şeması."""

    name: str
    code: str
