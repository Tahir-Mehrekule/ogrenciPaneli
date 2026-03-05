"""
Report repository (veri erişim) modülü.

Report tablosu için DB sorgularını tanımlar.
BaseRepository[Report]'dan türer — CRUD otomatik gelir.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.common.pagination import apply_search, apply_sorting, apply_pagination
from app.features.report.report_model import Report
from app.features.report.report_dto import ReportFilterParams


class ReportRepo(BaseRepository[Report]):
    """
    Report tablosu için repository.

    Ek sorgular:
    - get_by_project: Projedeki tüm raporlar
    - get_by_week: Belirli hafta/yıl raporunu getirir
    - get_filtered: Tüm filtreleri birleştirir + sayfalama
    """

    def __init__(self, db: Session):
        super().__init__(Report, db)

    def get_by_project(self, project_id: UUID) -> list[Report]:
        """Projedeki tüm aktif raporları getirir."""
        return (
            self.db.query(Report)
            .filter(Report.project_id == project_id)
            .filter(Report.is_active == True)
            .order_by(Report.year.desc(), Report.week_number.desc())
            .all()
        )

    def get_by_week(
        self, project_id: UUID, user_id: UUID, week_number: int, year: int
    ) -> Report | None:
        """Belirli bir hafta için kullanıcının raporunu getirir (duplicate kontrolü için)."""
        return (
            self.db.query(Report)
            .filter(Report.project_id == project_id)
            .filter(Report.submitted_by == user_id)
            .filter(Report.week_number == week_number)
            .filter(Report.year == year)
            .first()
        )

    def get_filtered(
        self, params: ReportFilterParams, user_id: UUID = None
    ) -> tuple[list[Report], int]:
        """
        Tüm filtreleri uygulayarak raporları getirir.

        Args:
            params: Filtreleme + sayfalama parametreleri
            user_id: STUDENT için sadece kendi raporlarını kısıtlar

        Returns:
            tuple[list[Report], int]: (rapor listesi, toplam sayı)
        """
        query = self.db.query(Report).filter(Report.is_active == True)

        # STUDENT için kısıtlama
        if user_id is not None:
            query = query.filter(Report.submitted_by == user_id)

        if params.project_id:
            query = query.filter(Report.project_id == params.project_id)
        if params.submitted_by:
            query = query.filter(Report.submitted_by == params.submitted_by)
        if params.status:
            query = query.filter(Report.status == params.status)
        if params.week_number:
            query = query.filter(Report.week_number == params.week_number)
        if params.year:
            query = query.filter(Report.year == params.year)
        if params.search:
            query = apply_search(query, Report, params.search, ["content"])

        total = query.count()
        query = apply_sorting(query, Report, params.sort_by, params.order)
        query = apply_pagination(query, params.page, params.size)

        return query.all(), total
