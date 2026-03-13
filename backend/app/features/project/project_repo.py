
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.common.enums import ProjectStatus
from app.common.pagination import apply_search, apply_sorting, apply_pagination
from app.features.project.project_model import Project
from app.features.project.project_dto import ProjectFilterParams


class ProjectRepo(BaseRepository[Project]):
    """
    Project tablosu için repository.

    Ek sorgular:
    - get_by_status: Durum bazlı filtreleme
    - get_by_creator: Kullanıcının projeleri
    - get_filtered: Tüm filtreleri birleştirir + sayfalama
    """

    def __init__(self, db: Session):
        super().__init__(Project, db)

    def get_by_status(self, status: ProjectStatus) -> list[Project]:
        """Belirli statüdeki aktif projeleri getirir."""
        return (
            self.db.query(Project)
            .filter(Project.status == status)
            .filter(Project.is_active == True)
            .all()
        )

    def get_by_creator(self, user_id: UUID) -> list[Project]:
        """Belirli bir kullanıcının oluşturduğu projeleri getirir."""
        return (
            self.db.query(Project)
            .filter(Project.created_by == user_id)
            .filter(Project.is_active == True)
            .all()
        )

    def get_filtered(self, params: ProjectFilterParams, user_id: UUID = None) -> tuple[list[Project], int]:
        """
        Tüm filtreleri uygulayarak projeleri getirir.

        Args:
            params: Filtreleme + sayfalama parametreleri
            user_id: Belirli bir kullanıcının projelerini filtrele (STUDENT için)

        Returns:
            tuple[list[Project], int]: (proje listesi, toplam kayıt sayısı)
        """
        query = self.db.query(Project).filter(Project.is_active == True)

        # Kullanıcı bazlı filtreleme (STUDENT sadece kendi projelerini görür)
        if user_id is not None:
            query = query.filter(Project.created_by == user_id)

        # Durum filtresi
        if params.status is not None:
            query = query.filter(Project.status == params.status)

        # Oluşturan filtresi (admin/teacher için)
        if params.created_by is not None:
            query = query.filter(Project.created_by == params.created_by)

        # Başlık araması
        if params.search:
            query = apply_search(query, Project, params.search, ["title", "description"])

        total = query.count()

        query = apply_sorting(query, Project, params.sort_by, params.order)
        query = apply_pagination(query, params.page, params.size)

        return query.all(), total
