

from sqlalchemy.orm import Session

from app.core.security import hash_password, create_access_token, create_refresh_token
from app.common.exceptions import NotFoundException
from app.features.auth.auth_repo import AuthRepo
from app.features.auth.auth_dto import (
    RegisterRequest,
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

    def register(self, data: RegisterRequest) -> TokenResponse:
      
        # 1. Validasyon ve rol belirleme
        role = validate_register_data(data.email, self.repo)

        # 2. Şifreyi hashle
        hashed_password = hash_password(data.password)

        # 3. Kullanıcıyı DB'ye kaydet
        user_data = {
            "email": data.email.lower().strip(),
            "password_hash": hashed_password,
            "name": data.name,
            "role": role,
            "department": data.department,
        }
        user = self.repo.create(user_data)

        # 4. Token oluştur
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def login(self, data: LoginRequest) -> TokenResponse:
       
        # 1. Doğrulama
        user = verify_login(data.email, data.password, self.repo)

        # 2. Token oluştur
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def refresh(self, data: RefreshTokenRequest) -> TokenResponse:
       
        # 1. Refresh token doğrula → user_id çıkar
        user_id = validate_refresh_token(data.refresh_token)

        # 2. Kullanıcı hâlâ aktif mi kontrol et
        user = self.repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise NotFoundException("Kullanıcı bulunamadı veya hesap devre dışı")

        # 3. Yeni token çifti oluştur
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    def get_profile(self, user) -> UserResponse:
        
        return UserResponse.model_validate(user)
