"""
User service (iş mantığı) modülü.

Kullanıcı yönetimi işlemlerinin orkestrasyon katmanı.
Manager'ı çağırarak validasyon yapar, repo'ya yönlendirerek DB işlemi yapar.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.exceptions import NotFoundException
from app.features.auth.auth_model import User
from app.features.user.user_repo import UserRepo
from app.features.user.user_manager import validate_role_change, validate_self_delete
from app.features.user.user_dto import (
    UserListResponse,
    UserUpdateRequest,
    UserFilterParams,
)


class UserService:
    """
    Kullanıcı yönetimi iş mantığı servisi.

    Sorumluluklar:
    - Kullanıcı listeleme (filtreli, sayfalanmış)
    - Kullanıcı detay görüntüleme
    - Kullanıcı güncelleme (rol, isim, bölüm)
    - Kullanıcı silme (soft delete)
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepo(db)

    def list_users(self, params: UserFilterParams) -> PaginatedResponse:
        """
        Filtreli ve sayfalanmış kullanıcı listesi döner.

        Args:
            params: Filtreleme + sayfalama parametreleri

        Returns:
            PaginatedResponse[UserListResponse]: Sayfalanmış kullanıcı listesi
        """
        # Dinamik filtre oluştur
        filters = {}
        if params.role is not None:
            filters["role"] = params.role
        if params.is_active is not None:
            filters["is_active"] = params.is_active

        # Bölüm araması — ILIKE (kısmi eşleşme)
        like_filters = {}
        if params.department is not None:
            like_filters["department"] = params.department

        users, total = self.repo.get_many(
            filters=filters,
            like_filters=like_filters if like_filters else None,
            search=params.search,
            search_fields=["name", "email"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
            active_only=False,  # is_active filtresini kendimiz yönetiyoruz
        )
        items = [UserListResponse.model_validate(u) for u in users]

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_user(self, user_id: UUID) -> UserListResponse:
        """
        ID ile tek kullanıcı detayını döner.

        Args:
            user_id: Kullanıcı UUID'si

        Returns:
            UserListResponse: Kullanıcı bilgileri

        Raises:
            NotFoundException: Kullanıcı bulunamazsa
        """
        user = self.repo.get_by_id_or_404(user_id)
        return UserListResponse.model_validate(user)

    def update_user(
        self,
        user_id: UUID,
        data: UserUpdateRequest,
        current_user: User,
    ) -> UserListResponse:
        """
        Kullanıcı bilgilerini günceller (kısmi güncelleme — PATCH).

        Rol değişikliği varsa ek validasyon uygulanır:
        - Kullanıcı kendi rolünü değiştiremez
        - Son admin'in rolü değiştirilemez

        Args:
            user_id: Güncellenecek kullanıcı UUID'si
            data: Güncellenecek alanlar (opsiyonel)
            current_user: İşlemi yapan kullanıcı

        Returns:
            UserListResponse: Güncellenmiş kullanıcı bilgileri

        Raises:
            NotFoundException: Kullanıcı bulunamazsa
            ForbiddenException: Kendi rolünü değiştirmeye çalışıyorsa
            BadRequestException: Son admin koruması devreye girerse
        """
        target_user = self.repo.get_by_id_or_404(user_id)

        # Rol değişikliği varsa validasyon yap
        if data.role is not None and data.role != target_user.role:
            admins, _ = self.repo.get_many(filters={"role": "admin"}, active_only=True)
            validate_role_change(current_user, target_user, data.role, len(admins))

        # None olan alanları filtrele (PATCH semantiği)
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated_user = self.repo.update(user_id, update_data)

        return UserListResponse.model_validate(updated_user)

    def delete_user(self, user_id: UUID, current_user: User) -> dict:
        """
        Kullanıcıyı soft delete ile siler (is_active=False).

        Args:
            user_id: Silinecek kullanıcı UUID'si
            current_user: İşlemi yapan kullanıcı

        Returns:
            dict: Başarı mesajı

        Raises:
            NotFoundException: Kullanıcı bulunamazsa
            ForbiddenException: Kendi hesabını silmeye çalışıyorsa
        """
        target_user = self.repo.get_by_id_or_404(user_id)

        # Kendi hesabını silme koruması
        validate_self_delete(current_user, target_user)

        self.repo.delete(user_id)
        return {"message": f"Kullanıcı başarıyla silindi: {target_user.name}"}
