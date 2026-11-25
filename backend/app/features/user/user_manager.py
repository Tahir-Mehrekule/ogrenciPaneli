"""
User manager (yardımcı işlemler) modülü.

Kullanıcı güncelleme ve silme işlemlerinin validasyon mantığını yönetir.
"""

from sqlalchemy.orm import Session

from app.base.base_manager import BaseManager
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
        if self.ids_equal(current_user.id, target_user.id):
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
        if self.ids_equal(current_user.id, target_user.id):
            raise ForbiddenException("Kendi hesabınızı silemezsiniz")

    def validate_can_modify_user(self, current_user: User, target_user: User) -> None:
        """
        Kullanıcı silme/pasifleştirme hiyerarşi kuralı.

        - ADMIN: herkesi değiştirebilir (kendi hesabı hariç — yukarıda).
        - TEACHER: sadece STUDENT'ları pasifleştirebilir; başka bir
          TEACHER veya ADMIN'i değiştiremez.
        """
        if current_user.role == UserRole.ADMIN:
            return
        if target_user.role != UserRole.STUDENT:
            raise ForbiddenException(
                "Öğretmenler yalnızca öğrenci hesaplarını pasifleştirebilir"
            )
