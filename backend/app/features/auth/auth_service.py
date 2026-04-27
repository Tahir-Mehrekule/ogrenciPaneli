

from sqlalchemy.orm import Session

from app.core.security import hash_password, create_access_token, create_refresh_token
from app.common.exceptions import NotFoundException
from app.common.enums import ActivityAction, EntityType, UserRole, ApprovalStatus
from app.common.activity_log_helper import log_activity
from app.features.auth.auth_repo import AuthRepo
from app.features.auth.auth_dto import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
)
from app.features.auth.auth_manager import (
    validate_register_data,
    verify_login,
    validate_refresh_token,
)


class AuthService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = AuthRepo(db)

    def register(self, data: RegisterRequest) -> RegisterResponse:
        """
        Yeni kullanıcı kaydı.

        Öğrenci (@ogr. mail): PENDING statüsünde oluşturulur, token dönmez.
        Öğretmen/Admin: APPROVED statüsünde oluşturulur, token ile birlikte döner.
        """
        # 1. Validasyon ve rol belirleme (student_no da bu aşamada doğrulanır)
        role = validate_register_data(data.email, data.student_no, self.repo, data.role)

        # 2. Şifreyi hashle
        hashed_password = hash_password(data.password)

        # 3. Onay durumunu belirle: öğrenciler onay bekler, diğerleri doğrudan onaylanır
        approval_status = (
            ApprovalStatus.PENDING if role == UserRole.STUDENT else ApprovalStatus.APPROVED
        )

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
            "approval_status": approval_status,
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
            details={"email": user.email, "role": user.role.value, "approval_status": approval_status.value}
        )

        # 6. Öğrenci → PENDING mesajı döner (token yok)
        if role == UserRole.STUDENT:
            return RegisterResponse(
                approval_status=ApprovalStatus.PENDING,
                message=(
                    "Kaydınız alındı. Öğretmeniniz veya yetkili tarafından onaylandıktan sonra "
                    "giriş yapabilirsiniz. Onay durumunuz için öğretmeniniz ile iletişime geçin."
                ),
            )

        # 7. Öğretmen/Admin → APPROVED + token döner
        token_data = {"sub": str(user.id)}
        return RegisterResponse(
            approval_status=ApprovalStatus.APPROVED,
            message="Kayıt başarılı. Giriş yapabilirsiniz.",
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def login(self, data: LoginRequest) -> TokenResponse:

        # 1. Doğrulama
        user = verify_login(data.email, data.password, self.repo)

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
       
        # 1. Refresh token doğrula → user_id çıkar
        user_id = validate_refresh_token(data.refresh_token)

        # 2. Kullanıcı hâlâ aktif mi kontrol et
        user = self.repo.get_by_id(user_id)
        if user is None or not user.is_active or user.is_deleted:
            raise NotFoundException("Kullanıcı bulunamadı veya hesap devre dışı")

        # 3. Yeni token çifti oluştur
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def get_profile(self, user) -> UserResponse:
        
        return UserResponse.model_validate(user)
