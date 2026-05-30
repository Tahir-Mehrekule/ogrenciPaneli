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
from app.base.base_dto import PaginatedResponse
from app.features.user.user_service import UserService
from app.features.user.user_repo import UserRepo
from app.features.user.user_dto import (
    UserListResponse,
    UserUpdateRequest,
    UpdateStudentInfoRequest,
    UserFilterParams,
    ImportStudentData,
    BulkImportResult,
    AdminCreateUserRequest,
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


@router.post(
    "",
    response_model=UserListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin → Yeni kullanıcı (öğretmen/öğrenci) ekle",
    description=(
        "Admin manuel olarak yeni TEACHER veya STUDENT oluşturur. "
        "Şifre admin tarafından belirlenir; email + student_no unique kontrol edilir. "
        "Sadece ADMIN erişebilir."
    ),
)
def admin_create_user(
    data: AdminCreateUserRequest,
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    return UserService(db).create_user_as_admin(data, current_user)


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


@router.post(
    "/import",
    response_model=BulkImportResult,
    summary="Toplu Öğrenci Ekleme (Import)",
    description="JSON formatında öğrenci listesi alır ve sisteme ekler. Sadece TEACHER ve ADMIN kullanabilir.",
)
def import_students(
    data: list[ImportStudentData],
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    return service.import_students(data)


@router.get(
    "/search",
    response_model=list[UserListResponse],
    summary="Öğrenci ara (davet için)",
    description=(
        "STUDENT listeleme/arama. "
        "q boş bırakılırsa bölüm filtresine göre tüm öğrencileri döner. "
        "same_grade=true ise sadece aynı sınıf, department_id verilirse o bölümdeki öğrenciler döner."
    ),
)
def search_users(
    q: str = Query(default="", description="Arama terimi (boş bırakılabilir)"),
    same_grade: bool = Query(default=False, description="Sadece aynı sınıfı getir"),
    department_id: UUID | None = Query(default=None, description="Bölüm filtresi"),
    limit: int = Query(default=20, ge=1, le=100, description="Maksimum sonuç sayısı"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry_year = current_user.entry_year if same_grade else None
    results = UserRepo(db).search_students(
        q=q,
        entry_year=entry_year,
        department_id=department_id,
        limit=limit,
    )
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
        "Sadece ADMIN erişebilir. "
        "Yeni numara başka öğrencide kayıtlıysa 409 döner."
    ),
)
def update_student_info(
    user_id: UUID,
    data: UpdateStudentInfoRequest,
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    return service.update_student_info(user_id, data, current_user)


@router.get(
    "/{user_id}/cascade-info",
    summary="Soft delete öncesi bağlı kayıt sayıları",
)
def user_cascade_info(
    user_id: UUID,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Bu kullanıcıyı silmeden önce kaç proje/üyelik/rapor etkileneceğini döner."""
    return UserService(db).get_cascade_info(user_id, current_user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Kullanıcı silme",
    description=(
        "Rol bazlı silme: "
        "ADMIN → hard delete (kalıcı), "
        "TEACHER → soft delete (is_active=False, pasifleştirme). "
        "Kişi kendini silemez."
    ),
)
def delete_user(
    user_id: UUID,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    return service.delete_user(user_id, current_user)


@router.post(
    "/{user_id}/deactivate",
    status_code=status.HTTP_200_OK,
    summary="Kullanıcıyı pasifleştir (admin soft delete)",
)
def deactivate_user(
    user_id: UUID,
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Admin: is_active=False yapar. Veri korunur, geri yüklenebilir."""
    return UserService(db).deactivate_user(user_id, current_user)


@router.post(
    "/{user_id}/restore",
    status_code=status.HTTP_200_OK,
    summary="Pasifleştirilmiş kullanıcıyı geri yükle",
)
def restore_user(
    user_id: UUID,
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Admin: is_active=True yapar."""
    return UserService(db).restore_user(user_id, current_user)
