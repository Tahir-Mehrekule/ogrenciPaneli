"""
ClassSection DTO modülü.

Bölüm + sınıf + şube kombinasyonu için request/response şemaları.
"""

from uuid import UUID
from typing import Optional, List

from pydantic import BaseModel, Field

from app.base.base_dto import BaseResponse


class ClassSectionCreate(BaseModel):
    """Yeni şube oluşturma isteği."""

    department_id: UUID = Field(description="Bölüm")
    grade_label: str = Field(
        min_length=2, max_length=50,
        description="Sınıf etiketi (örn: '2. Sınıf')",
    )
    branch_code: str = Field(
        min_length=1, max_length=10,
        description="Şube kodu (örn: 'A')",
    )
    capacity: Optional[int] = Field(default=None, ge=1, le=500)


class ClassSectionUpdate(BaseModel):
    """Şube güncelleme (kısmi)."""

    grade_label: Optional[str] = Field(default=None, min_length=2, max_length=50)
    branch_code: Optional[str] = Field(default=None, min_length=1, max_length=10)
    capacity: Optional[int] = Field(default=None, ge=1, le=500)


class ClassSectionResponse(BaseResponse):
    """Şube response'u."""

    department_id: UUID
    department_name: str = ""
    grade_label: str
    branch_code: str
    capacity: Optional[int] = None


class ClassSectionStats(BaseModel):
    """Sınıf düzeyi istatistikleri (sekme başlığında kullanılır)."""

    grade_label: str
    student_count: int
    section_count: int
    sections: List[str]
