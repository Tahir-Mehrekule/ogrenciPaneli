"""
ProjectCategory controller modülü.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.common.base_dto import MessageResponse
from app.features.project_category.project_category_service import ProjectCategoryService
from app.features.project_category.project_category_dto import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)

router = APIRouter(tags=["Project Categories"])


@router.get(
    "/api/v1/courses/{course_id}/categories",
    response_model=list[CategoryResponse],
    summary="Ders kategorilerini listele",
)
def list_categories(
    course_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectCategoryService(db).list_by_course(course_id)


@router.post(
    "/api/v1/courses/{course_id}/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni kategori oluştur",
    description="Teacher (sadece kendi dersi) veya Admin oluşturabilir.",
)
def create_category(
    course_id: UUID,
    data: CategoryCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectCategoryService(db).create(course_id, data, current_user)


@router.patch(
    "/api/v1/categories/{category_id}",
    response_model=CategoryResponse,
    summary="Kategori güncelle",
)
def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectCategoryService(db).update(category_id, data, current_user)


@router.delete(
    "/api/v1/categories/{category_id}",
    response_model=MessageResponse,
    summary="Kategori sil",
    description="İçinde aktif proje olan kategori silinemez (409 döner).",
)
def delete_category(
    category_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectCategoryService(db).delete(category_id, current_user)
