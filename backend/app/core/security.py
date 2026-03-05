"""
Güvenlik modülü.

JWT token oluşturma/doğrulama ve bcrypt şifre hash/verify işlemlerini yönetir.
Tüm auth işlemleri bu modüldeki fonksiyonları kullanır.
"""

from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings


# Bcrypt context — şifre hashleme ve doğrulama için
# schemes: kullanılacak hash algoritması
# deprecated: eski algoritmaları otomatik yenisiyle değiştirir
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Düz şifreyi bcrypt ile hashler.
    Aynı şifre her seferinde farklı hash üretir (salt sayesinde).

    Args:
        password: Kullanıcının girdiği düz şifre

    Returns:
        str: Bcrypt hash'lenmiş şifre (DB'ye bu kaydedilir)
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Login'de girilen şifreyi DB'deki hash ile karşılaştırır.

    Args:
        plain_password: Kullanıcının girdiği düz şifre
        hashed_password: DB'deki hash'lenmiş şifre

    Returns:
        bool: Şifre doğruysa True, yanlışsa False
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """
    15 dakika geçerli Access Token oluşturur.
    Kullanıcı her API isteğinde bu tokenı gönderir.

    Args:
        data: Token payload'ına eklenecek veri (genelde {"sub": user_id})

    Returns:
        str: JWT Access Token
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({
        "exp": expire,
        "type": "access",  # Token tipini belirt (access vs refresh ayırt etmek için)
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    7 gün geçerli Refresh Token oluşturur.
    Access Token süresi dolduğunda yeni token almak için kullanılır.

    Args:
        data: Token payload'ına eklenecek veri (genelde {"sub": user_id})

    Returns:
        str: JWT Refresh Token
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({
        "exp": expire,
        "type": "refresh",  # Refresh token olduğunu belirt
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict | None:
    """
    JWT tokenı çözer ve doğrular.
    Süresi dolmuşsa veya geçersizse None döner.

    Args:
        token: Doğrulanacak JWT token string'i

    Returns:
        dict | None: Token payload'ı (geçerliyse) veya None (geçersizse)
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
