"""
User controller (API endpoint) modülü.

Kullanıcı yönetimi endpoint'lerini tanımlar.
GET /users, GET /users/{id} → TEACHER ve ADMIN erişebilir.
PATCH /users/{id}, DELETE /users/{id} → sadece ADMIN erişebilir.
PATCH /users/{id}/student-info → TEACHER ve ADMIN erişebilir.

ÖNEMLİ: Statik path'ler (my-students, search) dinamik ({user_id}) path'lerden
önce tanımlanmalıdır — aksi hâlde FastAPI 422 döner.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.common.enums import UserRole
from app.common.base_dto import PaginatedResponse
from app.features.user.user_service import UserService
from app.features.user.user_repo import UserRepo
from app.features.user.user_dto import (
    UserListResponse,
    UserUpdateRequest,
    UpdateStudentInfoRequest,
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
    service = UserService(db)
    return service.list_users(params)


# ── Statik path'ler /{user_id}'dan ÖNCE tanımlanmalı ────────────────────────��

@router.get(
    "/my-students",
    response_model=PaginatedResponse,
    summary="Öğrencilerim",
    description=(
        "Öğretmenin kendi bölümlerindeki öğrencileri listeler. "
        "TEACHER ve ADMIN erişebilir."
    ),
)
def list_my_students(
    params: UserFilterParams = Depends(),
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    return service.list_my_students(current_user, params)


@router.get(
    "/search",
    response_model=list[UserListResponse],
    summary="Öğrenci ara (davet için)",
    description="Ad, soyad, mail veya okul numarasına göre öğrenci arar. same_grade=true ise sadece aynı sınıf döner.",
)
def search_users(
    q: str = Query(min_length=2, description="Arama terimi"),
    same_grade: bool = Query(default=False, description="Sadece aynı sınıfı getir"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry_year = current_user.entry_year if same_grade else None
    results = UserRepo(db).search_students(q=q, entry_year=entry_year)
    return [UserListResponse.model_validate(u) for u in results]


# ── Dinamik path'ler ──────────────────────────────────────────────────────────

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
    service = UserService(db)
    return service.update_user(user_id, data, current_user)


@router.patch(
    "/{user_id}/student-info",
    response_model=UserListResponse,
    summary="Öğrenci bilgisi güncelle",
    description=(
        "Öğrenci numarasını ve sınıf bilgisini günceller. "
        "TEACHER veya ADMIN erişebilir. "
        "Yeni numara başka öğrencide kayıtlıysa 409 döner."
    ),
)
def update_student_info(
    user_id: UUID,
    data: UpdateStudentInfoRequest,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    return service.update_student_info(user_id, data, current_user)


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
    service = UserService(db)
    return service.delete_user(user_id, current_user)
