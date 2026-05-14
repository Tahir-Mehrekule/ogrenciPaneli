"""
Auth controller modülü.

Endpoint'ler:
- POST /register    → 3 istek/dakika (spam koruması)
- POST /login       → 10 istek/dakika (brute-force koruması)
- POST /refresh     → 20 istek/dakika
- GET  /me          → Giriş yapmış kullanıcının profili
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.features.auth.auth_service import AuthService
from app.features.auth.auth_dto import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
)


# Router tanımı — tüm endpoint'ler /api/v1/auth altında gruplanır
router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Auth"],
)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni kullanıcı kaydı",
    description=(
        "Okul mail adresi ile kayıt. Rol email'den otomatik belirlenir "
        "(@ogr. → Student, diğer → Teacher). "
        "IP başına dakikada 3 kayıt isteği sınırı uygulanır."
    ),
)
@limiter.limit("3/minute")
def register(
    request: Request,
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.register(data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Kullanıcı girişi",
    description=(
        "Email ve şifre ile giriş. Başarılıysa access + refresh token döner. "
        "IP başına dakikada 10 giriş isteği sınırı uygulanır."
    ),
)
@limiter.limit("10/minute")
def login(
    request: Request,
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.login(data)


@router.post(
    "/swagger-login",
    response_model=TokenResponse,
    include_in_schema=False,
    summary="Swagger UI için giriş",
)
@limiter.limit("10/minute")
def swagger_login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Swagger'ın 'Authorize' butonu arka planda Form Data gönderir.
    Bu endpoint onu yakalayıp standart JSON objesine çevirir.
    """
    service = AuthService(db)
    data = LoginRequest(email=form_data.username, password=form_data.password)
    return service.login(data)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Token yenileme",
    description=(
        "Refresh token ile yeni access + refresh token çifti alınır "
        "(sliding expiration). IP başına dakikada 20 istek sınırı."
    ),
)
@limiter.limit("20/minute")
def refresh_token(
    request: Request,
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
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
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Profil güncelleme",
    description=(
        "Giriş yapmış kullanıcının ad ve/veya soyadını günceller. "
        "En az bir alan gönderilmesi zorunludur."
    ),
)
def update_profile(
    data: UpdateProfileRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.update_profile(current_user, data)


@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Şifre sıfırlama isteği",
    description=(
        "Kayıtlı email adresine şifre sıfırlama bağlantısı gönderir. "
        "Email yoksa bile 202 döner (kullanıcı enumeration koruması). "
        "⚠️ Development modunda token konsola yazılır; production'da email gönderilecek."
    ),
)
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.forgot_password(data)
    return {"message": "Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi."}


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Şifre sıfırlama",
    description=(
        "Sıfırlama token'ı ve yeni şifre ile şifre güncellenir. "
        "Token 1 saat geçerlidir; tek kullanımlıktır."
    ),
)
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.reset_password(data)


@router.patch(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Şifre değiştirme",
    description=(
        "Giriş yapmış kullanıcının şifresini değiştirir. "
        "Mevcut şifre doğrulanır; yeni şifre en az 8 karakter, "
        "1 büyük harf ve 1 rakam içermelidir."
    ),
)
def change_password(
    data: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.change_password(current_user, data)
    # 204 No Content — body yok
