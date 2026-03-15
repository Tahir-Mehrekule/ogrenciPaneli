"""
Course DTO (Data Transfer Object) modülü.

Ders oluşturma, güncelleme, listeleme ve kayıt için request/response şemaları.
"""

from uuid import UUID
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field

from app.common.base_dto import BaseResponse, FilterParams


# --- Course DTO'ları ---

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


class CourseResponse(BaseResponse):
    """
    Ders detay/liste response'u.
    BaseResponse'tan: id, created_at, updated_at
    """
    name: str
    code: str
    semester: str
    teacher_id: UUID
    is_active: bool


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


# --- CourseEnrollment DTO'ları ---

class EnrollmentResponse(BaseModel):
    """Derse kayıt response'u."""
    id: UUID
    course_id: UUID
    student_id: UUID
    enrolled_at: datetime  # created_at'in alias'ı olarak kullanılacak

    model_config = {"from_attributes": True}


class CourseStudentResponse(BaseModel):
    """Dersin öğrenci listesindeki öğrenci bilgisi."""
    id: UUID
    email: str
    name: str
    enrolled_at: datetime

    model_config = {"from_attributes": True}
