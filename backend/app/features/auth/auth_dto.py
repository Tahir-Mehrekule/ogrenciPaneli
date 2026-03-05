"""
Auth DTO (Data Transfer Object) modülü.

Kayıt, giriş ve token işlemleri için request/response şemalarını tanımlar.
Pydantic v2 ile otomatik validasyon sağlar.
"""

from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr

from app.common.enums import UserRole
from app.common.base_dto import BaseResponse


class RegisterRequest(BaseModel):
    """
    Kullanıcı kayıt isteği.

    Validasyonlar:
    - email: Geçerli email formatı (EmailStr ile)
    - password: Minimum 6 karakter
    - name: Minimum 2 karakter
    - department: Opsiyonel
    """
    email: EmailStr = Field(
        description="Okul mail adresi (.edu.tr)"
    )
    password: str = Field(
        min_length=6,
        description="Şifre (minimum 6 karakter)"
    )
    name: str = Field(
        min_length=2,
        max_length=150,
        description="Ad soyad"
    )
    department: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Bölüm adı"
    )


class LoginRequest(BaseModel):
    """
    Kullanıcı giriş isteği.
    Email ve şifre ile giriş yapılır.
    """
    email: EmailStr = Field(description="Okul mail adresi")
    password: str = Field(description="Şifre")


class TokenResponse(BaseModel):
    """
    Token response'u.
    Login ve refresh işlemlerinde döner.

    Response örneği:
    {
        "access_token": "eyJ...",
        "refresh_token": "eyJ...",
        "token_type": "bearer"
    }
    """
    access_token: str = Field(description="JWT Access Token (15 dk geçerli)")
    refresh_token: str = Field(description="JWT Refresh Token (7 gün geçerli)")
    token_type: str = Field(default="bearer", description="Token tipi")


class RefreshTokenRequest(BaseModel):
    """
    Token yenileme isteği.
    Access token süresi dolduğunda yeni token almak için kullanılır.
    """
    refresh_token: str = Field(description="Mevcut refresh token")


class UserResponse(BaseResponse):
    """
    Kullanıcı bilgileri response'u.
    Şifre hash'i ASLA response'ta gönderilmez!

    BaseResponse'tan miras alınan alanlar:
    - id, created_at, updated_at
    """
    email: str
    name: str
    role: UserRole
    department: Optional[str] = None
    is_active: bool
