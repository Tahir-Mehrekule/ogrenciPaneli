"""
Report repository (veri erişim) modülü.

Report tablosu için DB sorgularını tanımlar.
BaseRepository[Report]'dan türer — CRUD ve get_many otomatik gelir.
"""

from uuid import UUID
from typing import Optional

from sqlalchemy import desc, asc, or_
from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.features.report.report_model import Report


class ReportRepo(BaseRepository[Report]):
    """
    Report tablosu için repository.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, get_many, count, update, delete

    get_many ile tüm filtreleme, arama, sayfalama ve sıralama
    işlemleri merkezi olarak yapılır — burada ayrıca yazılmaz (DRY).

    Ek sorgular:
    - get_by_week: Belirli hafta/yıl raporunu getirir (duplicate kontrolü için özel sorgu)
    """

    def __init__(self, db: Session):
        super().__init__(Report, db)

    def get_by_week(
        self, project_id: UUID, user_id: UUID, week_number: int, year: int
    ) -> Report | None:
        """
        Belirli bir hafta için kullanıcının raporunu getirir (duplicate kontrolü için).
        Bu özel bir sorgu olduğu için get_many kapsamı dışındadır.
        """
        return (
            self.db.query(Report)
            .filter(Report.project_id == project_id)
            .filter(Report.submitted_by == user_id)
            .filter(Report.week_number == week_number)
            .filter(Report.year == year)
            .first()
        )

    def get_many_filtered(
        self,
        filters: dict = None,
        in_filters: dict = None,
        search: str = None,
        search_fields: list[str] = None,
        grade_label: Optional[str] = None,
        branch_code: Optional[str] = None,
        course_id: Optional[UUID] = None,
        course_ids: Optional[list[UUID]] = None,
        page: int = 1,
        size: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> tuple[list[Report], int]:
        """
        grade_label ve branch_code, raporu submit eden User'a JOIN ister.
        branch_code → User.class_section → ClassSection.branch_code üzerinden filtrelenir.
        course_id → Report.project → Project.course_id üzerinden filtrelenir.
        course_ids → birden fazla derse (örn. öğretmenin tüm dersleri) kısıt.
        """
        from app.features.auth.auth_model import User
        from app.features.class_section.class_section_model import ClassSection
        from app.features.project.project_model import Project

        query = self._not_deleted(self.db.query(Report))
        query = self._active_filter(query, active_only=True)

        if grade_label or branch_code:
            query = query.join(User, Report.submitted_by == User.id)

        if grade_label:
            query = query.filter(User.grade_label == grade_label)

        if branch_code:
            query = (
                query.join(ClassSection, User.class_section_id == ClassSection.id)
                     .filter(ClassSection.branch_code == branch_code)
            )

        if course_id or course_ids is not None:
            query = query.join(Project, Report.project_id == Project.id)
            if course_id:
                query = query.filter(Project.course_id == course_id)
            if course_ids is not None:
                query = query.filter(Project.course_id.in_(course_ids))

        if filters:
            for key, value in filters.items():
                column = getattr(Report, key, None)
                if column is not None and value is not None:
                    query = query.filter(column == value)

        if in_filters:
            for key, values in in_filters.items():
                column = getattr(Report, key, None)
                if column is not None and values:
                    query = query.filter(column.in_(values))

        if search and search_fields:
            term = f"%{search.strip()}%"
            conditions = [
                getattr(Report, f).ilike(term)
                for f in search_fields
                if getattr(Report, f, None) is not None
            ]
            if conditions:
                query = query.filter(or_(*conditions))

        total = query.count()

        sort_col = getattr(Report, sort_by, None)
        if sort_col is not None:
            query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

        skip = (page - 1) * size
        items = query.offset(skip).limit(size).all()
        return items, total
