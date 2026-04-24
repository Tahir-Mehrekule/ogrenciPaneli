

from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr

from app.common.enums import UserRole, ApprovalStatus
from app.common.base_dto import BaseResponse


class DepartmentInfo(BaseModel):
    """Bölüm özet bilgisi — response'larda kullanılır."""
    id: UUID
    name: str

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):

    email: EmailStr = Field(
        description="Okul mail adresi (.edu.tr)"
    )
    password: str = Field(
        min_length=6,
        description="Şifre (minimum 6 karakter)"
    )
    first_name: str = Field(
        min_length=2,
        max_length=100,
        description="Ad"
    )
    last_name: str = Field(
        min_length=2,
        max_length=100,
        description="Soyad"
    )
    role: UserRole = Field(
        description="Kullanıcı rolü — Öğrenci (@ogr. mail zorunlu) veya Öğretmen"
    )
    department_ids: list[str] = Field(
        default=[],
        description="Seçili bölüm ID'leri (UUID string listesi)"
    )
    student_no: Optional[str] = Field(
        default=None,
        min_length=9,
        max_length=9,
        pattern=r"^\d{9}$",
        description="9 haneli öğrenci numarası (sadece STUDENT rolü için zorunlu)"
    )


class LoginRequest(BaseModel):

    email: EmailStr = Field(description="Okul mail adresi")
    password: str = Field(description="Şifre")


class TokenResponse(BaseModel):

    access_token: str = Field(description="JWT Access Token (15 dk geçerli)")
    refresh_token: str = Field(description="JWT Refresh Token (7 gün geçerli)")
    token_type: str = Field(default="bearer", description="Token tipi")


class RegisterResponse(BaseModel):
    """
    Kayıt endpoint'inin yanıtı.
    - Öğrenci: approval_status=PENDING, token alanları null (giriş yapamaz)
    - Öğretmen/Admin: approval_status=APPROVED, token alanları dolu
    """
    approval_status: ApprovalStatus = Field(description="Hesap onay durumu")
    message: str = Field(description="Kullanıcıya gösterilecek bilgilendirme mesajı")
    access_token: Optional[str] = Field(default=None, description="JWT Access Token (sadece APPROVED hesaplar için)")
    refresh_token: Optional[str] = Field(default=None, description="JWT Refresh Token (sadece APPROVED hesaplar için)")
    token_type: str = Field(default="bearer", description="Token tipi")


class RefreshTokenRequest(BaseModel):

    refresh_token: str = Field(description="Mevcut refresh token")


class UserResponse(BaseResponse):

    email: str
    first_name: str
    last_name: str
    full_name: str
    role: UserRole
    departments: list[DepartmentInfo] = []
    student_no: Optional[str] = None
    approval_status: ApprovalStatus = ApprovalStatus.APPROVED
    grade_label: Optional[str] = None
    entry_year: Optional[int] = None
    is_active: bool
