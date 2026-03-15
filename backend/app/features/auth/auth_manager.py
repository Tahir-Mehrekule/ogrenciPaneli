
from app.common.enums import UserRole
from app.common.validators import validate_school_email, determine_role_from_email
from app.common.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ConflictException,
)
from app.core.security import verify_password, verify_token
from app.features.auth.auth_repo import AuthRepo
from app.features.auth.auth_model import User


def validate_register_data(email: str, repo: AuthRepo) -> UserRole:

    # 1. Okul maili kontrolü
    validate_school_email(email)

    # 2. Duplicate email kontrolü
    if repo.email_exists(email):
        raise ConflictException("Bu email adresi zaten kayıtlı")

    # 3. Rol belirleme
    role = determine_role_from_email(email)
    return role


def verify_login(email: str, password: str, repo: AuthRepo) -> User:

    # 1. Kullanıcıyı bul (get_by_email zaten is_active filtresi yapıyor)
    user = repo.get_by_email(email)
    if user is None:
        raise UnauthorizedException("Email veya şifre hatalı")

    # 2. Şifre kontrolü
    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Email veya şifre hatalı")

    return user


def validate_refresh_token(token: str) -> str:

    # 1. Token doğrulama
    payload = verify_token(token)
    if payload is None:
        raise UnauthorizedException("Geçersiz veya süresi dolmuş refresh token")

    # 2. Token tipi kontrolü
    if payload.get("type") != "refresh":
        raise UnauthorizedException("Geçersiz token tipi. Refresh token gerekli")

    # 3. User ID kontrolü
    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Token'da kullanıcı bilgisi bulunamadı")

    return user_id
