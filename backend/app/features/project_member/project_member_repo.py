"""
Project Member repository (veri erişim) modülü.

ProjectMember tablosu için DB sorgularını tanımlar.
BaseRepository[ProjectMember]'dan türer — CRUD otomatik gelir.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.project_member.project_member_model import ProjectMember


class ProjectMemberRepo(BaseRepository[ProjectMember]):
    """
    ProjectMember tablosu için repository.

    Ek sorgular:
    - get_project_members: Projedeki tüm üyeleri getirir
    - get_user_projects: Kullanıcının üyesi olduğu proje ID'leri
    - is_member: Üyelik kontrolü
    - get_member: Tekil üyelik kaydı (proje + kullanıcı)
    """

    def __init__(self, db: Session):
        super().__init__(ProjectMember, db)

    def get_project_members(self, project_id: UUID) -> list[ProjectMember]:
        """Projedeki tüm aktif üyeleri getirir."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.is_active == True)
            .all()
        )

    def get_user_projects(self, user_id: UUID) -> list[UUID]:
        """Kullanıcının aktif üyesi olduğu proje ID'lerini getirir."""
        rows = (
            self.db.query(ProjectMember.project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.is_active == True)
            .all()
        )
        return [row.project_id for row in rows]

    def is_member(self, project_id: UUID, user_id: UUID) -> bool:
        """Kullanıcının projede aktif üye olup olmadığını kontrol eder."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.is_active == True)
            .first()
        ) is not None

    def get_member(self, project_id: UUID, user_id: UUID) -> ProjectMember | None:
        """Tekil üyelik kaydını getirir (proje + kullanıcı kombinasyonu)."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.is_active == True)
            .first()
        )
