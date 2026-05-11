from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.base.base_dto import MessageResponse
from app.common.enums import UserRole
from app.features.student_prefix.student_prefix_service import StudentPrefixService
from app.features.student_prefix.student_prefix_dto import PrefixCreate, PrefixResponse, PrefixUpdate

router = APIRouter(prefix="/api/v1/admin/year-prefixes", tags=["Student Year Prefixes"])

_admin_only = Depends(role_required([UserRole.ADMIN]))


@router.get("", response_model=list[PrefixResponse], summary="Prefix listesi")
def list_prefixes(db: Session = Depends(get_db)):
    return StudentPrefixService(db).list_all()


@router.post("", response_model=PrefixResponse, status_code=status.HTTP_201_CREATED, summary="Prefix ekle")
def create_prefix(
    data: PrefixCreate,
    current_user=_admin_only,
    db: Session = Depends(get_db),
):
    return StudentPrefixService(db).create(data, current_user.id)


@router.patch("/{prefix_id}", response_model=PrefixResponse, summary="Prefix güncelle")
def update_prefix(
    prefix_id: UUID,
    data: PrefixUpdate,
    _=_admin_only,
    db: Session = Depends(get_db),
):
    return StudentPrefixService(db).update(prefix_id, data)


@router.delete("/{prefix_id}", response_model=MessageResponse, summary="Prefix sil")
def delete_prefix(
    prefix_id: UUID,
    _=_admin_only,
    db: Session = Depends(get_db),
):
    return StudentPrefixService(db).delete(prefix_id)
