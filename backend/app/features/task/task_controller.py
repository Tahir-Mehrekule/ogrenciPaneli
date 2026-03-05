"""
Task controller (API endpoint) modülü.

Görev yönetimi endpoint'lerini tanımlar.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.common.base_dto import PaginatedResponse
from app.features.task.task_service import TaskService
from app.features.task.task_dto import (
    TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse, TaskFilterParams,
)


router = APIRouter(
    prefix="/api/v1/tasks",
    tags=["Tasks"],
)


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Görev oluştur",
)
def create_task(
    data: TaskCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Yeni görev oluşturur. Proje sahibi veya ADMIN yapabilir."""
    return TaskService(db).create_task(data, current_user)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Görev listesi",
)
def list_tasks(
    params: TaskFilterParams = Depends(),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Filtreli görev listesi. STUDENT sadece üyesi olduğu projelerdeki görevleri görür."""
    return TaskService(db).list_tasks(params, current_user)


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Görev detayı",
)
def get_task(
    task_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ID ile görev detayı."""
    return TaskService(db).get_task(task_id, current_user)


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Görev güncelleme",
)
def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Görev bilgilerini günceller (PATCH). Proje sahibi veya ADMIN yapabilir."""
    return TaskService(db).update_task(task_id, data, current_user)


@router.patch(
    "/{task_id}/status",
    response_model=TaskResponse,
    summary="Durum güncelleme",
)
def update_status(
    task_id: UUID,
    data: TaskStatusUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Görev durumunu günceller. Durum geçiş kurallarına tabidir."""
    return TaskService(db).update_status(task_id, data, current_user)


@router.delete(
    "/{task_id}",
    summary="Görev sil",
)
def delete_task(
    task_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Görevi soft delete ile siler. Proje sahibi veya ADMIN yapabilir."""
    return TaskService(db).delete_task(task_id, current_user)
