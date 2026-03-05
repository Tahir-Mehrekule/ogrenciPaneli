"""
Auth controller (API endpoint) modülü.

Kayıt, giriş, token yenileme ve profil endpoint'lerini tanımlar.
Her endpoint AuthService'i çağırarak iş mantığını yönetir.
Controller'da iş mantığı YOKTUR — sadece request alır, service'e yönlendirir, response döner.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.features.auth.auth_service import AuthService
from app.features.auth.auth_dto import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
)


# Router tanımı — tüm endpoint'ler /api/v1/auth altında gruplanır
router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Auth"],  # Swagger UI'da gruplama için
)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni kullanıcı kaydı",
    description="Okul mail adresi ile kayıt. Rol email'den otomatik belirlenir "
                "(@ogr. → Student, diğer → Teacher).",
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Yeni kullanıcı kaydı.

    - Email .edu.tr ile bitmelidir
    - @ogr. içeriyorsa → STUDENT rolü atanır
    - Kayıt başarılıysa access + refresh token döner
    """
    service = AuthService(db)
    return service.register(data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Kullanıcı girişi",
    description="Email ve şifre ile giriş. Başarılıysa access + refresh token döner.",
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Kullanıcı girişi.

    - Email ve şifre doğrulanır
    - Hesap aktif olmalıdır
    - Başarılıysa access (15dk) + refresh (7 gün) token döner
    """
    service = AuthService(db)
    return service.login(data)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Token yenileme",
    description="Refresh token ile yeni access + refresh token çifti alınır "
                "(sliding expiration).",
)
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Token yenileme (sliding expiration).

    - Geçerli bir refresh token gereklidir
    - Kullanıcı hâlâ aktif olmalıdır
    - Yeni access + refresh token çifti döner
    """
    service = AuthService(db)
    return service.refresh(data)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Profil bilgisi",
    description="Giriş yapmış kullanıcının profil bilgilerini döner.",
)
def get_profile(
    current_user=Depends(get_current_user),
):
    """
    Mevcut kullanıcının profil bilgisi.

    - Geçerli bir access token gereklidir (Authorization header)
    - Şifre bilgisi response'ta YER ALMAZ
    """
    return UserResponse.model_validate(current_user)
