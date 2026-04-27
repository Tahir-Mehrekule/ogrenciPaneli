"""
Project Member repository (veri erişim) modülü.

ProjectMember tablosu için DB sorgularını tanımlar.
BaseRepository[ProjectMember]'dan türer — CRUD otomatik gelir.
"""

from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.common.base_repo import BaseRepository
from app.common.enums import MemberRole, MemberStatus
from app.features.project_member.project_member_model import ProjectMember


class ProjectMemberRepo(BaseRepository[ProjectMember]):
    """
    ProjectMember tablosu için repository.

    Temel sorgular:
    - get_active_members: Projedeki ACTIVE üyeleri getirir
    - get_pending_members: INVITED veya JOIN_REQUESTED kayıtları
    - get_member_record: Proje + kullanıcı kombinasyonu
    - is_active_member: Aktif üyelik kontrolü
    - has_pending_record: Bekleyen davet/istek kontrolü
    - get_manager: Projenin MANAGER'ını getirir
    - get_user_project_ids: Kullanıcının aktif üyesi olduğu proje ID'leri
    """

    def __init__(self, db: Session):
        super().__init__(ProjectMember, db)

    def get_active_members(self, project_id: UUID) -> list[ProjectMember]:
        """Projedeki ACTIVE üyeleri kullanıcı bilgileriyle getirir."""
        return (
            self.db.query(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.status == MemberStatus.ACTIVE)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .all()
        )

    def get_pending_members(self, project_id: UUID) -> list[ProjectMember]:
        """Projedeki INVITED veya JOIN_REQUESTED kayıtları döner."""
        return (
            self.db.query(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.status.in_([MemberStatus.INVITED, MemberStatus.JOIN_REQUESTED]))
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .all()
        )

    def get_member_record(self, project_id: UUID, user_id: UUID) -> ProjectMember | None:
        """Proje + kullanıcı kombinasyonu için herhangi bir kayıt döner (durum fark etmez)."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .first()
        )

    def get_member_by_id(self, member_id: UUID) -> ProjectMember | None:
        """Üyelik kaydını ID ile getirir."""
        return (
            self.db.query(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .filter(ProjectMember.id == member_id)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .first()
        )

    def is_active_member(self, project_id: UUID, user_id: UUID) -> bool:
        """Kullanıcının projede ACTIVE üye olup olmadığını kontrol eder."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.status == MemberStatus.ACTIVE)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .first()
        ) is not None

    def has_pending_record(self, project_id: UUID, user_id: UUID) -> bool:
        """Kullanıcı için bekleyen davet veya katılım isteği var mı?"""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.status.in_([MemberStatus.INVITED, MemberStatus.JOIN_REQUESTED]))
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .first()
        ) is not None

    def get_manager(self, project_id: UUID) -> ProjectMember | None:
        """Projenin MANAGER üyesini getirir."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.role == MemberRole.MANAGER)
            .filter(ProjectMember.status == MemberStatus.ACTIVE)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .first()
        )

    def is_manager(self, project_id: UUID, user_id: UUID) -> bool:
        """Kullanıcının projenin MANAGER'ı olup olmadığını kontrol eder."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.role == MemberRole.MANAGER)
            .filter(ProjectMember.status == MemberStatus.ACTIVE)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .first()
        ) is not None

    def count_active_members(self, project_id: UUID) -> int:
        """Projedeki ACTIVE üye sayısını döner."""
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .filter(ProjectMember.status == MemberStatus.ACTIVE)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .count()
        )

    def get_user_project_ids(self, user_id: UUID) -> list[UUID]:
        """Kullanıcının ACTIVE üyesi olduğu proje ID'lerini getirir."""
        rows = (
            self.db.query(ProjectMember.project_id)
            .filter(ProjectMember.user_id == user_id)
            .filter(ProjectMember.status == MemberStatus.ACTIVE)
            .filter(ProjectMember.is_active == True)
            .filter(ProjectMember.is_deleted == False)
            .all()
        )
        return [row.project_id for row in rows]
