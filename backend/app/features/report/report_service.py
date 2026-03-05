"""
Report service (iş mantığı) modülü.

Haftalık rapor oluşturma, güncelleme, teslim ve inceleme işlemlerinin orkestrasyon katmanı.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.enums import ReportStatus, UserRole
from app.common.exceptions import ForbiddenException, NotFoundException
from app.common.validators import validate_youtube_url
from app.features.report.report_repo import ReportRepo
from app.features.report.report_manager import (
    get_current_week_and_year,
    validate_weekly_uniqueness,
    validate_report_editable,
    validate_report_submittable,
    validate_report_owner,
)
from app.features.report.report_dto import (
    ReportCreate, ReportUpdate, ReviewRequest, ReportResponse, ReportFilterParams,
)
from app.features.auth.auth_model import User


class ReportService:
    """Haftalık rapor yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ReportRepo(db)

    def create_report(self, data: ReportCreate, current_user: User) -> ReportResponse:
        """
        Haftalık rapor oluşturur (DRAFT statüsünde).

        - Hafta/yıl otomatik hesaplanır
        - Aynı hafta için duplicate kontrolü yapılır
        - YouTube URL varsa format doğrulanır
        """
        if data.youtube_url:
            validate_youtube_url(data.youtube_url)

        week_number, year = get_current_week_and_year()
        validate_weekly_uniqueness(
            data.project_id, current_user.id, week_number, year, self.repo
        )

        report = self.repo.create({
            "project_id": data.project_id,
            "submitted_by": current_user.id,
            "week_number": week_number,
            "year": year,
            "content": data.content,
            "youtube_url": data.youtube_url,
            "status": ReportStatus.DRAFT,
        })
        return ReportResponse.model_validate(report)

    def list_reports(self, params: ReportFilterParams, current_user: User) -> PaginatedResponse:
        """
        Filtreli rapor listesi.
        STUDENT sadece kendi raporlarını görür.
        """
        user_id_filter = None
        if current_user.role == UserRole.STUDENT:
            user_id_filter = current_user.id

        reports, total = self.repo.get_filtered(params, user_id=user_id_filter)
        items = [ReportResponse.model_validate(r) for r in reports]

        return PaginatedResponse(
            items=items, total=total, page=params.page, size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_report(self, report_id: UUID, current_user: User) -> ReportResponse:
        """Rapor detayı. STUDENT sadece kendi raporunu görebilir."""
        report = self.repo.get_by_id_or_404(report_id)

        if (
            current_user.role == UserRole.STUDENT
            and str(report.submitted_by) != str(current_user.id)
        ):
            raise ForbiddenException("Bu raporu görüntüleme yetkiniz yok")

        return ReportResponse.model_validate(report)

    def update_report(self, report_id: UUID, data: ReportUpdate, current_user: User) -> ReportResponse:
        """Raporu günceller. Sadece DRAFT raporlar ve sadece sahip güncelleyebilir."""
        report = self.repo.get_by_id_or_404(report_id)
        validate_report_owner(report, current_user)
        validate_report_editable(report)

        if data.youtube_url:
            validate_youtube_url(data.youtube_url)

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(report_id, update_data)
        return ReportResponse.model_validate(updated)

    def submit_report(self, report_id: UUID, current_user: User) -> ReportResponse:
        """Raporu teslim eder: DRAFT → SUBMITTED."""
        report = self.repo.get_by_id_or_404(report_id)
        validate_report_owner(report, current_user)
        validate_report_submittable(report)
        updated = self.repo.update(report_id, {"status": ReportStatus.SUBMITTED})
        return ReportResponse.model_validate(updated)

    def review_report(self, report_id: UUID, data: ReviewRequest, current_user: User) -> ReportResponse:
        """
        Raporu inceler ve geri bildirim ekler: SUBMITTED → REVIEWED.
        Sadece TEACHER/ADMIN yapabilir.
        """
        report = self.repo.get_by_id_or_404(report_id)

        if report.status != ReportStatus.SUBMITTED:
            from app.common.exceptions import BadRequestException
            raise BadRequestException(
                f"Sadece SUBMITTED raporlar incelenebilir. Mevcut durum: {report.status.value}"
            )

        updated = self.repo.update(report_id, {
            "status": ReportStatus.REVIEWED,
            "reviewer_note": data.reviewer_note,
        })
        return ReportResponse.model_validate(updated)
