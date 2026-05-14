

from sqlalchemy.orm import Session

from app.core.security import hash_password, create_access_token, create_refresh_token
from app.common.exceptions import NotFoundException
from app.common.enums import ActivityAction, EntityType, UserRole
from app.common.activity_log_helper import log_activity
from app.features.auth.auth_repo import AuthRepo
from app.features.auth.auth_dto import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.features.auth.auth_manager import AuthManager


class AuthService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = AuthRepo(db)
        self.manager = AuthManager(db)

    def register(self, data: RegisterRequest) -> RegisterResponse:
        """
        Yeni kullanıcı kaydı.

        Öğrenci (@ogr. mail): PENDING statüsünde oluşturulur, token dönmez.
        Öğretmen/Admin: APPROVED statüsünde oluşturulur, token ile birlikte döner.
        """
        # 1. Validasyon ve rol belirleme (student_no da bu aşamada doğrulanır)
        role = self.manager.validate_register_data(data.email, data.student_no, data.role)

        # 2. Şifreyi hashle
        hashed_password = hash_password(data.password)

        # 4. Öğrenci no'sundan prefix eşleşmesi ile sınıf bilgisini belirle
        entry_year = None
        grade_label = None
        student_no_val = data.student_no if role == UserRole.STUDENT else None
        if student_no_val:
            from app.features.student_prefix.student_prefix_repo import StudentPrefixRepo
            match = StudentPrefixRepo(self.db).match_student_no(student_no_val)
            if match:
                entry_year = match.entry_year
                grade_label = match.label

        # 5. Kullanıcıyı DB'ye kaydet
        user_data = {
            "email": data.email.lower().strip(),
            "password_hash": hashed_password,
            "first_name": data.first_name.strip(),
            "last_name": data.last_name.strip(),
            "role": role,
            "student_no": student_no_val,

            "entry_year": entry_year,
            "grade_label": grade_label,
        }
        user = self.repo.create(user_data)

        # 5b. Bölüm ilişkilerini kaydet (user_departments)
        if data.department_ids:
            from app.features.user_department.user_department_model import UserDepartment
            from app.features.department.department_repo import DepartmentRepo
            dept_repo = DepartmentRepo(self.db)
            for dept_id_str in data.department_ids:
                try:
                    from uuid import UUID
                    dept = dept_repo.get_by_id(UUID(dept_id_str))
                    if dept:
                        ud = UserDepartment(user_id=user.id, department_id=dept.id)
                        self.db.add(ud)
                except (ValueError, Exception):
                    pass
            self.db.commit()
            self.db.refresh(user)

        log_activity(
            self.db, ActivityAction.USER_REGISTER, user_id=user.id,
            entity_type=EntityType.USER, entity_id=user.id,
            details={"email": user.email, "role": user.role.value}
        )

        # 6. Öğrenci veya Öğretmen/Admin → doğrudan token döner
        token_data = {"sub": str(user.id)}
        return RegisterResponse(
            message="Kayıt başarılı. Giriş yapabilirsiniz.",
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def login(self, data: LoginRequest) -> TokenResponse:

        # 1. Doğrulama
        user = self.manager.verify_login(data.email, data.password)

        # 2. Token oluştur
        token_data = {"sub": str(user.id)}
        log_activity(self.db, ActivityAction.USER_LOGIN, user_id=user.id,
                     entity_type=EntityType.USER, entity_id=user.id,
                     details={"email": user.email})
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def refresh(self, data: RefreshTokenRequest) -> TokenResponse:
        from datetime import datetime, timezone
        from app.core.security import verify_token
        from app.features.auth.revoked_token_model import RevokedToken
        from app.common.exceptions import UnauthorizedException

        # 1. Token'ı çöz ve tip kontrolü yap
        payload = verify_token(data.refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Geçersiz refresh token")

        jti = payload.get("jti")
        exp = payload.get("exp")

        # 2. Token daha önce kullanılmış mu? (revocation kontrolü)
        if jti and self.db.get(RevokedToken, jti):
            raise UnauthorizedException("Bu refresh token daha önce kullanılmış. Lütfen yeniden giriş yapın.")

        # 3. user_id çıkar ve kullanıcı durumunu kontrol et
        user_id = self.manager.validate_refresh_token(data.refresh_token)
        user = self.repo.get_by_id(user_id)
        if user is None or not user.is_active or user.is_deleted:
            raise NotFoundException("Kullanıcı bulunamadı veya hesap devre dışı")

        # 4. Eski refresh token'ı revoke et
        if jti and exp:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
            revoked = RevokedToken(jti=jti, token_type="refresh", expires_at=expires_at)
            self.db.add(revoked)
            self.db.commit()

        # 5. Yeni token çifti oluştur (rotation)
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def change_password(self, user, data: ChangePasswordRequest) -> None:
        """
        Kimliği doğrulanmış kullanıcının şifresini değiştirir.

        Adımlar:
        1. Mevcut şifre doğrulanır (yanlışsa 401).
        2. Yeni şifrenin güç kurallarına uyup uymadığı kontrol edilir.
        3. Yeni şifre, mevcut şifreden farklı olmalıdır.
        4. Yeni şifre hashlenip DB'ye yazılır.
        """
        from app.core.security import verify_password, hash_password
        from app.common.exceptions import UnauthorizedException, BadRequestException

        # 1. Mevcut şifre kontrolü
        if not verify_password(data.current_password, user.password_hash):
            raise UnauthorizedException("Mevcut şifre hatalı")

        # 2. Şifre gücü
        if not data.is_new_password_strong:
            raise BadRequestException(
                "Yeni şifre en az 8 karakter, 1 büyük harf ve 1 rakam içermelidir"
            )

        # 3. Aynı şifre tekrar kullanılamaz
        if verify_password(data.new_password, user.password_hash):
            raise BadRequestException("Yeni şifre eski şifreden farklı olmalıdır")

        # 4. Hash ve kaydet
        user.password_hash = hash_password(data.new_password)
        self.db.commit()

        log_activity(
            self.db, ActivityAction.USER_PASSWORD_CHANGE, user_id=user.id,
            entity_type=EntityType.USER, entity_id=user.id,
            details={"action": "password_changed"},
        )

    def forgot_password(self, data: ForgotPasswordRequest) -> None:
        """
        Şifre sıfırlama token'ı oluşturur.

        Kullanıcı yoksa bile başarılı döner (enumeration koruması).
        Development modunda token konsola yazılır.
        TODO: Production'da email servisine bağlanacak (G-10).
        """
        import secrets
        import logging
        from datetime import timedelta
        from app.features.auth.password_reset_model import PasswordResetToken
        from app.core.config import settings

        logger = logging.getLogger(__name__)

        user = self.repo.get_by_email(data.email.lower())
        if user is None or user.is_deleted or not user.is_active:
            # Kullanıcı enumeration'ı önle — her durumda aynı yanıt
            return

        # Mevcut token varsa sil (email başına tek aktif token)
        existing = (
            self.db.query(PasswordResetToken)
            .filter(PasswordResetToken.user_id == user.id)
            .first()
        )
        if existing:
            self.db.delete(existing)

        # Yeni token oluştur (1 saat geçerli)
        from datetime import datetime, timezone
        token = secrets.token_urlsafe(64)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=getattr(settings, "RESET_TOKEN_EXPIRE_MINUTES", 60)
        )
        reset_token = PasswordResetToken(
            token=token,
            user_id=user.id,
            expires_at=expires_at,
        )
        self.db.add(reset_token)
        self.db.commit()

        # TODO: Email servisi entegre edildiğinde bu satırı email gönderimi ile değiştir
        reset_link = f"/auth/reset-password?token={token}"
        logger.warning(
            "[DEV-ONLY] Şifre sıfırlama linki — production'da email ile gönderilecek: %s",
            reset_link,
        )

    def reset_password(self, data: ResetPasswordRequest) -> None:
        """
        Token ile şifre sıfırlama.

        1. Token doğrulanır (varlık + süre).
        2. Yeni şifre gücü kontrol edilir.
        3. Şifre güncellenir, token silinir.
        """
        import logging
        from app.features.auth.password_reset_model import PasswordResetToken
        from app.core.security import hash_password
        from app.common.exceptions import BadRequestException

        logger = logging.getLogger(__name__)

        reset_token = self.db.get(PasswordResetToken, data.token)
        if reset_token is None or reset_token.is_expired():
            raise BadRequestException(
                "Sıfırlama bağlantısı geçersiz veya süresi dolmuş. "
                "Lütfen yeni sıfırlama isteği oluşturun."
            )

        # Şifre gücü kontrolü
        p = data.new_password
        if not (len(p) >= 8 and any(c.isupper() for c in p) and any(c.isdigit() for c in p)):
            raise BadRequestException(
                "Yeni şifre en az 8 karakter, 1 büyük harf ve 1 rakam içermelidir"
            )

        user = self.repo.get_by_id(reset_token.user_id)
        if user is None or user.is_deleted or not user.is_active:
            raise BadRequestException("Hesap bulunamadı")

        user.password_hash = hash_password(data.new_password)
        self.db.delete(reset_token)
        self.db.commit()

        log_activity(
            self.db, ActivityAction.USER_PASSWORD_CHANGE, user_id=user.id,
            entity_type=EntityType.USER, entity_id=user.id,
            details={"action": "password_reset"},
        )

    def update_profile(self, user, data) -> UserResponse:
        """
        Kullanıcının kendi ad/soyad bilgisini günceller.

        - En az bir alan gönderilmesi zorunludur.
        - Sadece kullanıcının kendisi çağırabilir (PATCH /auth/me).
        """
        from app.common.exceptions import BadRequestException

        update_data = {}
        if data.first_name is not None:
            update_data["first_name"] = data.first_name.strip()
        if data.last_name is not None:
            update_data["last_name"] = data.last_name.strip()

        if not update_data:
            raise BadRequestException("Güncellenecek en az bir alan gönderilmelidir")

        for key, value in update_data.items():
            setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)

        log_activity(
            self.db, ActivityAction.USER_UPDATE, user_id=user.id,
            entity_type=EntityType.USER, entity_id=user.id,
            details={"fields": list(update_data.keys())},
        )
        return UserResponse.model_validate(user)

    def get_profile(self, user) -> UserResponse:

        return UserResponse.model_validate(user)
