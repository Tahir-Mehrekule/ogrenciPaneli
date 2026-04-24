
from typing import Optional

from app.common.enums import UserRole, ApprovalStatus
from app.common.validators import validate_school_email, determine_role_from_email
from app.common.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
)
from app.core.security import verify_password, verify_token
from app.features.auth.auth_repo import AuthRepo
from app.features.auth.auth_model import User


def validate_register_data(
    email: str,
    student_no: Optional[str],
    repo: AuthRepo,
    requested_role: Optional[UserRole] = None,
) -> UserRole:
    """
    Kayıt verilerini doğrular ve kullanıcı rolünü belirler.

    Email-rol tutarlılık kuralı:
    - '@ogr.' içeren mail → sadece STUDENT seçilebilir
    - '@ogr.' içermeyen .edu.tr mail → sadece TEACHER seçilebilir

    Returns:
        Onaylanan UserRole
    Raises:
        BadRequestException, ConflictException
    """
    # 1. Okul maili kontrolü
    validate_school_email(email)

    # 2. Duplicate email kontrolü
    if repo.email_exists(email):
        raise ConflictException("Bu email adresi zaten kayıtlı")

    # 3. Email'den beklenen rolü belirle
    expected_role = determine_role_from_email(email)

    # 4. Kullanıcının seçtiği rol ile email tutarlılık kontrolü
    if requested_role is not None and requested_role != UserRole.ADMIN:
        is_student_email = "@ogr." in email.lower()
        if is_student_email and requested_role != UserRole.STUDENT:
            raise BadRequestException(
                "@ogr. mail adresiyle sadece 'Öğrenci' olarak kayıt olunabilir"
            )
        if not is_student_email and requested_role == UserRole.STUDENT:
            raise BadRequestException(
                "Öğrenci olarak kayıt için @ogr. uzantılı okul maili gereklidir"
            )

    role = expected_role

    # 5. Öğrenci numarası validasyonu (sadece STUDENT rolü için)
    if role == UserRole.STUDENT:
        if not student_no:
            raise BadRequestException("Öğrenci numarası zorunludur (@ogr. mail ile kayıt için)")
        if not (len(student_no) == 9 and student_no.isdigit()):
            raise BadRequestException("Öğrenci numarası 9 haneli rakamdan oluşmalıdır")
        if repo.student_no_exists(student_no):
            raise ConflictException(
                "Bu öğrenci numarası zaten kayıtlı. "
                "Numaranızı yanlış girdiyseniz öğretmeninizle iletişime geçin."
            )

    return role


def verify_login(email: str, password: str, repo: AuthRepo) -> User:
    """
    Giriş doğrulaması yapar.

    Onaylanmamış (PENDING) veya reddedilmiş (REJECTED) hesaplar giriş yapamaz.

    Returns:
        Doğrulanmış ve onaylanmış User nesnesi
    Raises:
        UnauthorizedException, ForbiddenException
    """
    # 1. Kullanıcıyı bul (get_by_email zaten is_active filtresi yapıyor)
    user = repo.get_by_email(email)
    if user is None:
        raise UnauthorizedException("Email veya şifre hatalı")

    # 2. Şifre kontrolü
    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Email veya şifre hatalı")

    # 3. Hesap onay durumu kontrolü
    if user.approval_status == ApprovalStatus.PENDING:
        raise ForbiddenException(
            "Hesabınız henüz onaylanmadı. Öğretmeniniz veya yetkili tarafından "
            "onaylandıktan sonra giriş yapabilirsiniz."
        )
    if user.approval_status == ApprovalStatus.REJECTED:
        raise ForbiddenException(
            "Hesabınız reddedildi. Daha fazla bilgi için öğretmeniniz ile iletişime geçin."
        )

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
