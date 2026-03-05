"""
User repository (veri erişim) modülü.

User tablosu için filtreleme ve arama sorgularını tanımlar.
BaseRepository[User]'dan türer — temel CRUD işlemleri otomatik gelir.
"""

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.common.enums import UserRole
from app.common.pagination import apply_search, apply_sorting, apply_pagination
from app.features.auth.auth_model import User
from app.features.user.user_dto import UserFilterParams


class UserRepo(BaseRepository[User]):
    """
    User tablosu için repository.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, count, update, delete, hard_delete

    Ek sorgular:
    - filter_by_role: Rol bazlı filtreleme
    - filter_by_department: Bölüm bazlı filtreleme
    - search_by_name: İsim araması
    - get_filtered: Tüm filtreleri birleştiren ana sorgu
    """

    def __init__(self, db: Session):
        super().__init__(User, db)

    def filter_by_role(self, role: UserRole) -> list[User]:
        """
        Belirli bir role sahip aktif kullanıcıları getirir.

        Args:
            role: Filtrelenecek kullanıcı rolü

        Returns:
            Kullanıcı listesi
        """
        return (
            self.db.query(User)
            .filter(User.role == role)
            .filter(User.is_active == True)
            .all()
        )

    def filter_by_department(self, department: str) -> list[User]:
        """
        Belirli bir bölümdeki aktif kullanıcıları getirir.
        Büyük/küçük harf duyarsız arama yapar (ILIKE).

        Args:
            department: Bölüm adı (kısmi eşleşme desteklenir)

        Returns:
            Kullanıcı listesi
        """
        return (
            self.db.query(User)
            .filter(User.department.ilike(f"%{department}%"))
            .filter(User.is_active == True)
            .all()
        )

    def get_filtered(self, params: UserFilterParams) -> tuple[list[User], int]:
        """
        Tüm filtreleri uygulayarak kullanıcıları getirir.
        Sayfalama ve sıralama ile birlikte çalışır.

        Uygulanan filtreler (opsiyonel, sadece verilense uygulanır):
        - role: Rol filtresi
        - department: Bölüm filtresi
        - is_active: Aktif/pasif filtresi
        - search: İsim veya email araması

        Args:
            params: UserFilterParams (sayfalama + filtreleme parametreleri)

        Returns:
            tuple[list[User], int]: (kullanıcı listesi, toplam kayıt sayısı)
        """
        query = self.db.query(User)

        # is_active filtresi
        if params.is_active is not None:
            query = query.filter(User.is_active == params.is_active)

        # Rol filtresi
        if params.role is not None:
            query = query.filter(User.role == params.role)

        # Bölüm filtresi
        if params.department is not None:
            query = query.filter(User.department.ilike(f"%{params.department}%"))

        # İsim veya email araması
        if params.search:
            query = apply_search(query, User, params.search, ["name", "email"])

        # Toplam kayıt sayısı (sayfalama öncesi)
        total = query.count()

        # Sıralama ve sayfalama uygula
        query = apply_sorting(query, User, params.sort_by, params.order)
        query = apply_pagination(query, params.page, params.size)

        return query.all(), total
