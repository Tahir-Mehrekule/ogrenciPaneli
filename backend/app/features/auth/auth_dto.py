

from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr

from app.common.enums import UserRole
from app.common.base_dto import BaseResponse


class RegisterRequest(BaseModel):

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

    email: EmailStr = Field(description="Okul mail adresi")
    password: str = Field(description="Şifre")


class TokenResponse(BaseModel):

    access_token: str = Field(description="JWT Access Token (15 dk geçerli)")
    refresh_token: str = Field(description="JWT Refresh Token (7 gün geçerli)")
    token_type: str = Field(default="bearer", description="Token tipi")


class RefreshTokenRequest(BaseModel):
  
    refresh_token: str = Field(description="Mevcut refresh token")


class UserResponse(BaseResponse):

    email: str
    name: str
    role: UserRole
    department: Optional[str] = None
    is_active: bool
