"""
Department Controller (API uç noktaları) modülü.

Bölüm yönetimi sadece ADMIN rolüne açıktır.
Prefix: /api/v1/admin/departments
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import role_required
from app.common.enums import UserRole
from app.features.department.department_service import DepartmentService
from app.features.department.department_dto import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)

router = APIRouter(
    prefix="/api/v1/admin/departments",
    tags=["Departments"],
)

_admin_only = Depends(role_required([UserRole.ADMIN]))


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni bölüm oluştur",
    description="Admin panelinden yeni bölüm ekler. Aynı isimde bölüm varsa 409 döner.",
)
def create_department(
    data: DepartmentCreate,
    _=_admin_only,
    db: Session = Depends(get_db),
):
    return DepartmentService(db).create(data)


@router.get(
    "",
    response_model=list[DepartmentResponse],
    summary="Bölümleri listele",
    description="Tüm aktif bölümleri isme göre sıralı listeler.",
)
def list_departments(
    db: Session = Depends(get_db),
):
    return DepartmentService(db).list_all()


@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Bölüm detayı",
)
def get_department(
    department_id: UUID,
    _=_admin_only,
    db: Session = Depends(get_db),
):
    return DepartmentService(db).get(department_id)


@router.patch(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Bölüm güncelle",
)
def update_department(
    department_id: UUID,
    data: DepartmentUpdate,
    _=_admin_only,
    db: Session = Depends(get_db),
):
    return DepartmentService(db).update(department_id, data)


@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Bölüm sil",
    description="Bölümü soft-delete ile pasif yapar.",
)
def delete_department(
    department_id: UUID,
    _=_admin_only,
    db: Session = Depends(get_db),
):
    DepartmentService(db).delete(department_id)
