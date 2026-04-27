"""
Project repository (veri erişim) modülü.

Project tablosu için DB sorgularını tanımlar.
BaseRepository[Project]'dan türer — CRUD ve get_many otomatik gelir.
"""

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.project.project_model import Project


class ProjectRepo(BaseRepository[Project]):
    """
    Project tablosu için repository.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, get_many, count, update, delete, hard_delete

    get_many ile tüm filtreleme, arama, sayfalama ve sıralama
    işlemleri merkezi olarak yapılır — burada ayrıca yazılmaz (DRY).
    """

    def __init__(self, db: Session):
        super().__init__(Project, db)

    def get_by_share_code(self, share_code: str) -> Project | None:
        """Paylaşım kodu ile projeyi getirir."""
        return (
            self.db.query(Project)
            .filter(Project.share_code == share_code)
            .filter(Project.is_active == True)
            .filter(Project.is_deleted == False)
            .first()
        )
