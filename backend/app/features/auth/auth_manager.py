from typing import Optional

from sqlalchemy.orm import Session

from app.base.base_manager import BaseManager
from app.common.enums import UserRole
from app.common.validators import (
    validate_school_email,
    determine_role_from_email,
    validate_password_strength,
)
from app.common.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
)
from app.core.security import verify_password, verify_token
from app.features.auth.auth_repo import AuthRepo
from app.features.auth.auth_model import User
from app.features.student_prefix.student_prefix_repo import StudentPrefixRepo


class AuthManager(BaseManager):

    def __init__(self, db: Session):
        super().__init__(db)
        self.repo = AuthRepo(db)

    def validate_register_data(
        self,
        email: str,
        student_no: Optional[str],
        requested_role: Optional[UserRole] = None,
    ) -> UserRole:
        """
        Kayıt verilerini doğrular ve kullanıcı rolünü belirler.

        Email-rol tutarlılık kuralı:
        - '@ogr.' içeren mail → sadece STUDENT seçilebilir
        - '@ogr.' içermeyen .edu.tr mail → sadece TEACHER seçilebilir

        Returns:
            Onaylanan UserRole
        """
        validate_school_email(email)

        if self.repo.email_exists(email):
            raise ConflictException("Bu email adresi zaten kayıtlı")

        expected_role = determine_role_from_email(email)

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

        if role == UserRole.STUDENT:
            if not student_no:
                raise BadRequestException("Öğrenci numarası zorunludur (@ogr. mail ile kayıt için)")
            if not (len(student_no) == 9 and student_no.isdigit()):
                raise BadRequestException("Öğrenci numarası 9 haneli rakamdan oluşmalıdır")
            if self.repo.student_no_exists(student_no):
                raise ConflictException(
                    "Bu öğrenci numarası zaten kayıtlı. "
                    "Numaranızı yanlış girdiyseniz öğretmeninizle iletişime geçin."
                )

        return role

    def verify_login(self, email: str, password: str) -> User:
        """
        Giriş doğrulaması yapar.
        Onaylanmamış veya reddedilmiş hesaplar giriş yapamaz.
        """
        user = self.repo.get_by_email(email)
        if user is None:
            raise UnauthorizedException("Email veya şifre hatalı")

        if not verify_password(password, user.password_hash):
            raise UnauthorizedException("Email veya şifre hatalı")



        return user

    def validate_refresh_token(self, token: str) -> tuple[str, str | None, int | None]:
        """
        Refresh token'ı TEK parse ile doğrular.

        Doğrulama: imza/süre + tip (refresh) + sub (user_id) varlığı.

        Returns:
            (user_id, jti, exp) — jti ve exp revocation/rotation için service'e döner.
            Service ikinci kez parse etmez (çift iş önlenir).
        """
        payload = verify_token(token)
        if payload is None:
            raise UnauthorizedException("Geçersiz veya süresi dolmuş refresh token")

        if payload.get("type") != "refresh":
            raise UnauthorizedException("Geçersiz token tipi. Refresh token gerekli")

        user_id = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException("Token'da kullanıcı bilgisi bulunamadı")

        return user_id, payload.get("jti"), payload.get("exp")

    def resolve_student_class(self, student_no) -> tuple:
        """
        Öğrenci numarasının prefix'inden (giriş yılı, sınıf etiketi) belirler.

        Eşleşme yoksa (None, None) döner — kayıt yine de devam eder.

        Returns:
            (entry_year, grade_label)
        """
        if not student_no:
            return None, None
        match = StudentPrefixRepo(self.db).match_student_no(student_no)
        if match:
            return match.entry_year, match.label
        return None, None

    def validate_password_change(self, user: User, current_password: str, new_password: str) -> None:
        """
        Şifre değiştirme kurallarını doğrular (DB yazımı service'te).

        1. Mevcut şifre doğru olmalı (yanlışsa 401).
        2. Yeni şifre güç kurallarına uymalı.
        3. Yeni şifre eskiden farklı olmalı.
        """
        if not verify_password(current_password, user.password_hash):
            raise UnauthorizedException("Mevcut şifre hatalı")

        validate_password_strength(new_password)

        if verify_password(new_password, user.password_hash):
            raise BadRequestException("Yeni şifre eski şifreden farklı olmalıdır")

    def validate_reset_password(self, reset_token, new_password: str) -> None:
        """
        Şifre sıfırlama kurallarını doğrular (token silme + DB yazımı service'te).

        1. Token var ve süresi dolmamış olmalı.
        2. Yeni şifre güç kurallarına uymalı.
        """
        if reset_token is None or reset_token.is_expired():
            raise BadRequestException(
                "Sıfırlama bağlantısı geçersiz veya süresi dolmuş. "
                "Lütfen yeni sıfırlama isteği oluşturun."
            )
        validate_password_strength(new_password)
