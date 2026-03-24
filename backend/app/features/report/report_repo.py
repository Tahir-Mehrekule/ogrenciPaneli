"""
Report repository (veri erişim) modülü.

Report tablosu için DB sorgularını tanımlar.
BaseRepository[Report]'dan türer — CRUD ve get_many otomatik gelir.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.report.report_model import Report


class ReportRepo(BaseRepository[Report]):
    """
    Report tablosu için repository.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, get_many, count, update, delete, hard_delete

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
