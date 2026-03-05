"""
User manager (yardımcı işlemler) modülü.

Kullanıcı güncelleme ve silme işlemlerinin validasyon mantığını yönetir.
Rol değişikliği kuralları ve self-modification koruması burada uygulanır.
"""

from uuid import UUID

from app.common.enums import UserRole
from app.common.exceptions import ForbiddenException, BadRequestException
from app.features.auth.auth_model import User


def validate_role_change(
    current_user: User,
    target_user: User,
    new_role: UserRole,
    admin_count: int,
) -> None:
    """
    Rol değişikliği kurallarını doğrular.

    Kurallar:
    1. Kullanıcı kendi rolünü değiştiremez
    2. Son admin'in rolü değiştirilemez (sistem kilitlenmesi önlenir)

    Args:
        current_user: İşlemi yapan kullanıcı (ADMIN olması gerekir)
        target_user: Rolü değiştirilecek kullanıcı
        new_role: Atanmak istenen yeni rol
        admin_count: Sistemdeki toplam aktif admin sayısı

    Raises:
        ForbiddenException: Kendi rolünü değiştirmeye çalışıyorsa
        BadRequestException: Son admin'in rolü değiştirilmeye çalışılıyorsa
    """
    # 1. Kullanıcı kendi rolünü değiştiremez
    if str(current_user.id) == str(target_user.id):
        raise ForbiddenException("Kendi rolünüzü değiştiremezsiniz")

    # 2. Son admin'in rolü değiştirilemez
    if (
        target_user.role == UserRole.ADMIN
        and new_role != UserRole.ADMIN
        and admin_count <= 1
    ):
        raise BadRequestException(
            "Sistemdeki son admin kullanıcısının rolü değiştirilemez"
        )


def validate_self_delete(current_user: User, target_user: User) -> None:
    """
    Kullanıcının kendi hesabını silmesini engeller.

    Args:
        current_user: İşlemi yapan kullanıcı
        target_user: Silinmek istenen kullanıcı

    Raises:
        ForbiddenException: Kendi hesabını silmeye çalışıyorsa
    """
    if str(current_user.id) == str(target_user.id):
        raise ForbiddenException("Kendi hesabınızı silemezsiniz")
