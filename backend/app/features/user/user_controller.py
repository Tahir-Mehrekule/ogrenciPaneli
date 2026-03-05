"""
User controller (API endpoint) modülü.

Kullanıcı yönetimi endpoint'lerini tanımlar.
GET /users, GET /users/{id} → TEACHER ve ADMIN erişebilir.
PATCH /users/{id}, DELETE /users/{id} → sadece ADMIN erişebilir.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.common.enums import UserRole
from app.common.base_dto import PaginatedResponse
from app.features.user.user_service import UserService
from app.features.user.user_dto import (
    UserListResponse,
    UserUpdateRequest,
    UserFilterParams,
)


router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Kullanıcı listesi",
    description="Filtreli ve sayfalanmış kullanıcı listesi. TEACHER ve ADMIN erişebilir.",
)
def list_users(
    params: UserFilterParams = Depends(),
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Kullanıcı listesi.

    - Rol, bölüm, isim/email araması ile filtrelenebilir
    - Sayfalama destekler
    """
    service = UserService(db)
    return service.list_users(params)


@router.get(
    "/{user_id}",
    response_model=UserListResponse,
    summary="Kullanıcı detayı",
    description="ID ile tekil kullanıcı bilgisi. TEACHER ve ADMIN erişebilir.",
)
def get_user(
    user_id: UUID,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Tek kullanıcı detayı.

    - Kullanıcı bulunamazsa 404 döner
    """
    service = UserService(db)
    return service.get_user(user_id)


@router.patch(
    "/{user_id}",
    response_model=UserListResponse,
    summary="Kullanıcı güncelleme",
    description="Kısmi güncelleme (PATCH). Sadece ADMIN erişebilir.",
)
def update_user(
    user_id: UUID,
    data: UserUpdateRequest,
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Kullanıcı güncelleme (PATCH).

    - Sadece gönderilen alanlar güncellenir
    - Rol değişikliği için ek validasyon uygulanır
    """
    service = UserService(db)
    return service.update_user(user_id, data, current_user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Kullanıcı silme",
    description="Soft delete (is_active=False). Sadece ADMIN erişebilir.",
)
def delete_user(
    user_id: UUID,
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Kullanıcı silme (soft delete).

    - Veri silinmez, is_active=False yapılır
    - Kendi hesabın silinemez
    """
    service = UserService(db)
    return service.delete_user(user_id, current_user)
