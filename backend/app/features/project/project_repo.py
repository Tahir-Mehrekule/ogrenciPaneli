"""
Project repository (veri erişim) modülü.

Project tablosu için DB sorgularını tanımlar.
BaseRepository[Project]'dan türer — CRUD ve get_many otomatik gelir.
"""

from uuid import UUID
from typing import Optional

from sqlalchemy import desc, asc, or_
from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.features.project.project_model import Project


class ProjectRepo(BaseRepository[Project]):
    """
    Project tablosu için repository.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, get_many, count, update, delete
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

    def get_many_filtered(
        self,
        filters: dict = None,
        search: str = None,
        search_fields: list[str] = None,
        grade_label: Optional[str] = None,
        page: int = 1,
        size: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> tuple[list[Project], int]:
        """
        grade_label filtresi için User tablosuna JOIN yapan özel listeleme.
        grade_label verilmezse BaseRepo.get_many() ile aynı davranır.
        """
        from app.features.auth.auth_model import User

        query = self._not_deleted(self.db.query(Project))
        query = self._active_filter(query, active_only=True)

        if grade_label:
            query = query.join(User, Project.created_by == User.id)
            query = query.filter(User.grade_label == grade_label)

        if filters:
            for key, value in filters.items():
                column = getattr(Project, key, None)
                if column is not None and value is not None:
                    query = query.filter(column == value)

        if search and search_fields:
            term = f"%{search.strip()}%"
            conditions = [
                getattr(Project, f).ilike(term)
                for f in search_fields
                if getattr(Project, f, None) is not None
            ]
            if conditions:
                query = query.filter(or_(*conditions))

        total = query.count()

        sort_col = getattr(Project, sort_by, None)
        if sort_col is not None:
            query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

        skip = (page - 1) * size
        items = query.offset(skip).limit(size).all()
        return items, total
