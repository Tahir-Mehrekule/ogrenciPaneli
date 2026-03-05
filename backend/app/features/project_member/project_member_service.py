"""
Project Member service (iş mantığı) modülü.

Proje üyesi ekleme, çıkarma ve listeleme işlemlerini yönetir.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    BadRequestException,
)
from app.features.project.project_repo import ProjectRepo
from app.features.auth.auth_repo import AuthRepo
from app.features.project_member.project_member_repo import ProjectMemberRepo
from app.features.project_member.project_member_dto import (
    AddMemberRequest,
    ProjectMemberResponse,
)
from app.features.auth.auth_model import User


class ProjectMemberService:
    """Proje üyesi yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectMemberRepo(db)
        self.project_repo = ProjectRepo(db)
        self.auth_repo = AuthRepo(db)

    def list_members(self, project_id: UUID) -> list[ProjectMemberResponse]:
        """
        Projedeki tüm aktif üyeleri listeler.

        Args:
            project_id: Proje UUID'si

        Returns:
            Üye listesi

        Raises:
            NotFoundException: Proje bulunamazsa
        """
        self.project_repo.get_by_id_or_404(project_id)
        members = self.repo.get_project_members(project_id)
        return [ProjectMemberResponse.model_validate(m) for m in members]

    def add_member(
        self,
        project_id: UUID,
        data: AddMemberRequest,
        current_user: User,
    ) -> ProjectMemberResponse:
        """
        Projeye yeni üye ekler.

        Kurallar:
        - Proje sahibi veya ADMIN olmalı
        - Eklenecek kullanıcı STUDENT rolünde olmalı
        - Kullanıcı zaten üye olmamalı

        Args:
            project_id: Proje UUID'si
            data: Üye ekleme bilgileri (user_id, role)
            current_user: İşlemi yapan kullanıcı

        Raises:
            NotFoundException: Proje veya kullanıcı bulunamazsa
            ForbiddenException: Yetki yoksa
            BadRequestException: Eklenecek kullanıcı öğrenci değilse
            ConflictException: Kullanıcı zaten üyeyse
        """
        # Proje kontrolü
        project = self.project_repo.get_by_id_or_404(project_id)

        # Yetki kontrolü: sadece proje sahibi veya admin ekleyebilir
        if (
            str(project.created_by) != str(current_user.id)
            and current_user.role != UserRole.ADMIN
        ):
            raise ForbiddenException("Üye ekleme yetkiniz yok")

        # Eklenecek kullanıcı kontrolü
        target_user = self.auth_repo.get_by_id(data.user_id)
        if target_user is None:
            raise NotFoundException("Eklenecek kullanıcı bulunamadı")

        # Sadece öğrenci eklenebilir
        if target_user.role != UserRole.STUDENT:
            raise BadRequestException("Projeye sadece öğrenci rolündeki kullanıcılar eklenebilir")

        # Mükerrer üyelik kontrolü
        if self.repo.is_member(project_id, data.user_id):
            raise ConflictException(f"Bu kullanıcı projeye zaten üye: {target_user.name}")

        # Üye ekle
        member = self.repo.create({
            "project_id": project_id,
            "user_id": data.user_id,
            "role": data.role,
        })
        return ProjectMemberResponse.model_validate(member)

    def remove_member(
        self,
        project_id: UUID,
        user_id: UUID,
        current_user: User,
    ) -> dict:
        """
        Projeden üye çıkarır.

        Kurallar:
        - Proje sahibi veya ADMIN olmalı
        - Proje sahibi (created_by) çıkarılamaz

        Args:
            project_id: Proje UUID'si
            user_id: Çıkarılacak kullanıcı UUID'si
            current_user: İşlemi yapan kullanıcı

        Raises:
            NotFoundException: Proje veya üyelik kaydı bulunamazsa
            ForbiddenException: Yetki yoksa veya proje sahibini çıkarmaya çalışıyorsa
        """
        # Proje kontrolü
        project = self.project_repo.get_by_id_or_404(project_id)

        # Yetki kontrolü
        if (
            str(project.created_by) != str(current_user.id)
            and current_user.role != UserRole.ADMIN
        ):
            raise ForbiddenException("Üye çıkarma yetkiniz yok")

        # Proje sahibi çıkarılamaz
        if str(project.created_by) == str(user_id):
            raise ForbiddenException("Proje sahibi üye listesinden çıkarılamaz")

        # Üyelik kaydını bul
        member = self.repo.get_member(project_id, user_id)
        if member is None:
            raise NotFoundException("Bu kullanıcı projede üye değil")

        # Soft delete
        self.repo.delete(member.id)
        return {"message": "Üye başarıyla projeden çıkarıldı"}
