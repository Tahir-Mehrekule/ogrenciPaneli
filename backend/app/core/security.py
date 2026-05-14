"""
Güvenlik modülü.

JWT token oluşturma/doğrulama ve bcrypt şifre hash/verify işlemlerini yönetir.
Her token benzersiz bir jti (JWT ID) içerir — revocation için kullanılır.
"""

import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings


# Bcrypt context — şifre hashleme ve doğrulama için
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Düz şifreyi bcrypt ile hashler.
    Aynı şifre her seferinde farklı hash üretir (salt sayesinde).
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Login'de girilen şifreyi DB'deki hash ile karşılaştırır.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """
    15 dakika geçerli Access Token oluşturur.
    Payload'a benzersiz jti eklenir.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({
        "exp": expire,
        "type": "access",
        "jti": str(uuid.uuid4()),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    7 gün geçerli Refresh Token oluşturur.
    Payload'a benzersiz jti eklenir (revocation için kullanılır).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict | None:
    """
    JWT tokenı çözer ve doğrular.
    Süresi dolmuşsa veya geçersizse None döner.
    jti revocation kontrolü burada YAPILMAZ — servis katmanında yapılır.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None
