"""
FastAPI dependency modülü.

API endpoint'lerinde kullanılan ortak dependency'leri tanımlar:
- get_current_user: JWT tokendan aktif kullanıcıyı çıkarır
- role_required: Belirli rollere erişim kısıtlaması sağlar
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_token


# OAuth2 Bearer Token şeması
# tokenUrl: Swagger UI'daki "Authorize" butonu bu endpoint'e istek atar
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/swagger-login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    JWT tokendan aktif kullanıcıyı çıkarır.

    Kontroller:
    1. Token geçerli mi? (imza, süre)
    2. Token tipi "access" mi? (refresh token ile API çağrısı engellenir)
    3. Kullanıcı DB'de var mı?
    4. Kullanıcı aktif mi? (is_active=True)

    Args:
        token: Authorization header'dan gelen JWT token
        db: Veritabanı oturumu

    Returns:
        User: Doğrulanmış aktif kullanıcı objesi

    Raises:
        HTTPException 401: Token geçersiz, süresi dolmuş veya kullanıcı bulunamadı
        HTTPException 401: Kullanıcı pasif (is_active=False)
    """
    # Geçersiz token hatası
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Tokenı doğrula
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    # 2. Token tipi kontrolü — sadece access token kabul edilir
    if payload.get("type") != "access":
        raise credentials_exception

    # 3. Token'dan user_id çıkar
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # 4. Kullanıcıyı DB'den çek
    # Lazy import: auth_model henüz oluşturulmadığında import hatası önlenir
    from app.features.auth.auth_model import User

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # 5. Kullanıcı aktif mi kontrol et (soft delete kontrolü)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı hesabı devre dışı bırakılmış",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def role_required(allowed_roles: list):
    """
    Belirli rollere erişim kısıtlaması sağlayan dependency factory.

    Kullanım:
        @router.get("/admin-only")
        def admin_endpoint(user = Depends(role_required([UserRole.ADMIN]))):
            ...

        @router.get("/teacher-or-admin")
        def teacher_endpoint(user = Depends(role_required([UserRole.TEACHER, UserRole.ADMIN]))):
            ...

    Args:
        allowed_roles: İzin verilen rol listesi (UserRole enum değerleri)

    Returns:
        Dependency fonksiyonu: Kullanıcının rolünü kontrol eder
    """

    def role_checker(current_user=Depends(get_current_user)):
        """Kullanıcının rolünün izin listesinde olup olmadığını kontrol eder."""
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu işlem için yetkiniz bulunmuyor",
            )
        return current_user

    return role_checker
