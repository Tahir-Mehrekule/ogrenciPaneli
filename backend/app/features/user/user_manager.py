"""
User manager (yardımcı işlemler) modülü.

Kullanıcı güncelleme ve silme işlemlerinin validasyon mantığını yönetir.
"""

from sqlalchemy.orm import Session

from app.common.base_manager import BaseManager
from app.common.enums import UserRole
from app.common.exceptions import ForbiddenException, BadRequestException
from app.features.auth.auth_model import User


class UserManager(BaseManager):

    def __init__(self, db: Session):
        super().__init__(db)

    def validate_role_change(
        self,
        current_user: User,
        target_user: User,
        new_role: UserRole,
        admin_count: int,
    ) -> None:
        """
        Rol değişikliği kurallarını doğrular.
        - Kullanıcı kendi rolünü değiştiremez
        - Son admin'in rolü değiştirilemez
        """
        if str(current_user.id) == str(target_user.id):
            raise ForbiddenException("Kendi rolünüzü değiştiremezsiniz")

        if (
            target_user.role == UserRole.ADMIN
            and new_role != UserRole.ADMIN
            and admin_count <= 1
        ):
            raise BadRequestException(
                "Sistemdeki son admin kullanıcısının rolü değiştirilemez"
            )

    def validate_self_delete(self, current_user: User, target_user: User) -> None:
        """Kullanıcının kendi hesabını silmesini engeller."""
        if str(current_user.id) == str(target_user.id):
            raise ForbiddenException("Kendi hesabınızı silemezsiniz")
