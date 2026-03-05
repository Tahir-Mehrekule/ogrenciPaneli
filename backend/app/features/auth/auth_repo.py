"""
Auth repository (veri erişim) modülü.

User tablosu için veritabanı sorgularını tanımlar.
BaseRepository'den türer — CRUD işlemleri otomatik gelir.
Ek sorgular: email ile arama, rol bazlı filtreleme.
"""

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.auth.auth_model import User
from app.common.enums import UserRole


class AuthRepo(BaseRepository[User]):
    """
    User tablosu için repository.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, count, update, delete, hard_delete

    Ek sorgular:
    - get_by_email: Email ile kullanıcı bulma (login için)
    - get_by_role: Rol bazlı kullanıcı listesi
    - email_exists: Email'in daha önce kayıtlı olup olmadığını kontrol
    """

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> User | None:
        """
        Email adresi ile kullanıcı bulma.
        Login işleminde kullanılır.

        Args:
            email: Aranacak email adresi

        Returns:
            User objesi veya None (bulunamazsa)
        """
        return (
            self.db.query(User)
            .filter(User.email == email.lower().strip())
            .filter(User.is_active == True)
            .first()
        )

    def get_by_role(self, role: UserRole) -> list[User]:
        """
        Belirli bir role sahip tüm aktif kullanıcıları getirir.
        Admin panelinde kullanılır (örn: tüm öğretmenleri listele).

        Args:
            role: Filtrelenecek rol (STUDENT, TEACHER, ADMIN)

        Returns:
            Kullanıcı listesi
        """
        return (
            self.db.query(User)
            .filter(User.role == role)
            .filter(User.is_active == True)
            .all()
        )

    def email_exists(self, email: str) -> bool:
        """
        Email adresinin daha önce kayıtlı olup olmadığını kontrol eder.
        Kayıt sırasında duplicate kontrolü için kullanılır.

        Args:
            email: Kontrol edilecek email adresi

        Returns:
            True: Email zaten kayıtlı, False: Email müsait
        """
        user = (
            self.db.query(User)
            .filter(User.email == email.lower().strip())
            .first()
        )
        return user is not None
