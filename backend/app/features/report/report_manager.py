"""
Report manager (yardımcı işlemler) modülü.

Haftalık rapor kuralları ve validasyon mantığını yönetir.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.common.base_manager import BaseManager
from app.common.enums import ReportStatus
from app.common.exceptions import ConflictException, ForbiddenException, BadRequestException
from app.features.report.report_model import Report
from app.features.report.report_repo import ReportRepo


class ReportManager(BaseManager):

    def __init__(self, db: Session):
        super().__init__(db)
        self.repo = ReportRepo(db)

    def get_current_week_and_year(self) -> tuple[int, int]:
        """Mevcut ISO hafta numarasını ve yılı döner."""
        today = datetime.now()
        iso = today.isocalendar()
        return iso.week, iso.year

    def validate_weekly_uniqueness(
        self, project_id, user_id, week_number: int, year: int
    ) -> None:
        """Aynı hafta için aynı kullanıcı-proje kombinasyonunda rapor olup olmadığını kontrol eder."""
        existing = self.repo.get_by_week(project_id, user_id, week_number, year)
        if existing is not None:
            raise ConflictException(
                f"{year} yılının {week_number}. haftası için rapor zaten mevcut"
            )

    def validate_report_editable(self, report: Report) -> None:
        """Raporun düzenlenebilir (DRAFT) durumda olup olmadığını kontrol eder."""
        if report.status != ReportStatus.DRAFT:
            raise ForbiddenException(
                f"Sadece DRAFT raporlar düzenlenebilir. Mevcut durum: {report.status.value}"
            )

    def validate_report_submittable(self, report: Report) -> None:
        """Raporun teslim edilebilir (DRAFT) durumda olup olmadığını kontrol eder."""
        if report.status != ReportStatus.DRAFT:
            raise BadRequestException(
                f"Sadece DRAFT raporlar teslim edilebilir. Mevcut durum: {report.status.value}"
            )

    def validate_report_owner(self, report: Report, user) -> None:
        """Kullanıcının raporun sahibi olup olmadığını kontrol eder."""
        if str(report.submitted_by) != str(user.id):
            raise ForbiddenException("Bu rapor üzerinde işlem yapmaya yetkiniz yok")
