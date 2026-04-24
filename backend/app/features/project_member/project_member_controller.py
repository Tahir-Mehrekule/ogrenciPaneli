"""
Project Member controller (API endpoint) modülü.

Davet, katılım isteği, kabul/red, devir, istifa ve arşivleme endpoint'lerini tanımlar.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.features.project_member.project_member_service import ProjectMemberService
from app.features.project_member.project_member_dto import (
    InviteMemberRequest,
    ProjectMemberResponse,
    PendingMemberResponse,
    TransferManagerRequest,
)
from app.common.base_dto import MessageResponse

router = APIRouter(tags=["Project Members"])

# ── Üye Listeleme ─────────────────────────────────────────────────────────────

@router.get(
    "/api/v1/projects/{project_id}/members",
    response_model=list[ProjectMemberResponse],
    summary="Aktif üye listesi",
)
def list_active_members(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).list_active_members(project_id)


@router.get(
    "/api/v1/projects/{project_id}/members/pending",
    response_model=list[PendingMemberResponse],
    summary="Bekleyen davet ve katılım istekleri",
    description="Yönetici, Teacher veya Admin görebilir.",
)
def list_pending(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).list_pending(project_id, current_user)


# ── Davet ─────────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/projects/{project_id}/invite",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Kullanıcıya davet gönder",
    description="Proje yöneticisi veya Admin sınıf kısıtına uygun öğrenciyi davet eder.",
)
def invite_member(
    project_id: UUID,
    data: InviteMemberRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).invite_member(project_id, data, current_user)


# ── Katılım İsteği ────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/projects/{project_id}/join-request",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Projeye katılım isteği gönder",
    description="Öğrenci share_code ile bulduğu projeye katılmak için istek atar.",
)
def request_join(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).request_join(project_id, current_user)


# ── Kabul / Red ───────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/projects/{project_id}/members/{member_id}/accept",
    response_model=ProjectMemberResponse,
    summary="Davet veya katılım isteğini kabul et",
)
def accept_member(
    project_id: UUID,
    member_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).accept_member(project_id, member_id, current_user)


@router.post(
    "/api/v1/projects/{project_id}/members/{member_id}/reject",
    response_model=MessageResponse,
    summary="Davet veya katılım isteğini reddet",
)
def reject_member(
    project_id: UUID,
    member_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).reject_member(project_id, member_id, current_user)


# ── Üye Çıkarma ───────────────────────────────────────────────────────────────

@router.delete(
    "/api/v1/projects/{project_id}/members/{user_id}",
    response_model=MessageResponse,
    summary="Üyeyi projeden çıkar",
    description="Yönetici (MEMBER'ları), Teacher veya Admin (herkesi) çıkarabilir.",
)
def remove_member(
    project_id: UUID,
    user_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).remove_member(project_id, user_id, current_user)


# ── Yöneticilik Devri ─────────────────────────────────────────────────────────

@router.patch(
    "/api/v1/projects/{project_id}/members/transfer-manager",
    response_model=MessageResponse,
    summary="Yöneticilik devret",
    description="Mevcut yönetici veya Admin aktif bir üyeye yöneticilik devreder.",
)
def transfer_manager(
    project_id: UUID,
    data: TransferManagerRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).transfer_manager(project_id, data, current_user)


# ── İstifa ────────────────────────────────────────────────────────────────────

@router.delete(
    "/api/v1/projects/{project_id}/members/me",
    response_model=MessageResponse,
    summary="Projeden istifa et",
    description="Kullanıcı kendi isteğiyle projeden ayrılır. Yönetici devir yapmadan istifa edemez.",
)
def resign(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).resign(project_id, current_user)


# ── Arşivleme ─────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/projects/{project_id}/archive",
    response_model=MessageResponse,
    summary="Projeyi arşivle",
    description="Sadece Teacher ve Admin arşivleyebilir.",
)
def archive_project(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).archive_project(project_id, current_user)


@router.post(
    "/api/v1/projects/{project_id}/unarchive",
    response_model=MessageResponse,
    summary="Projeyi arşivden çıkar",
    description="Sadece Teacher ve Admin arşivden çıkarabilir.",
)
def unarchive_project(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProjectMemberService(db).unarchive_project(project_id, current_user)
