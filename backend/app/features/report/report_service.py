"""
Report service (iş mantığı) modülü.

Haftalık rapor oluşturma, güncelleme, teslim ve inceleme işlemlerinin orkestrasyon katmanı.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.enums import ReportStatus, UserRole, NotificationType, ActivityAction, EntityType
from app.common.notification_helper import send_notification
from app.common.activity_log_helper import log_activity
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
from app.features.project.project_model import Project
from app.features.course.course_model import Course
from app.features.file.file_repo import FileRepo


class ReportService:
    """Haftalık rapor yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ReportRepo(db)

    def _enrich_with_course(self, report, response: ReportResponse) -> ReportResponse:
        """Rapor response'una ders bilgisini ekler (report → project → course)."""
        try:
            project = report.project
            if project and project.course_id:
                course = project.course
                if course:
                    response.course_name = course.name
                    response.course_code = course.code
        except Exception:
            pass
        return response

    def _to_response(self, report) -> ReportResponse:
        """Rapor nesnesini response DTO'ya dönüştürür ve ders bilgisiyle zenginleştirir."""
        response = ReportResponse.model_validate(report)
        return self._enrich_with_course(report, response)

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
        return self._to_response(report)

    def list_reports(self, params: ReportFilterParams, current_user: User) -> PaginatedResponse:
        """
        Filtreli rapor listesi.
        STUDENT sadece kendi raporlarını görür.
        """
        # Dinamik filtre oluştur
        filters = {}
        if params.project_id:
            filters["project_id"] = params.project_id
        if params.submitted_by:
            filters["submitted_by"] = params.submitted_by
        if params.status:
            filters["status"] = params.status
        if params.week_number:
            filters["week_number"] = params.week_number
        if params.year:
            filters["year"] = params.year

        # STUDENT sadece kendi raporlarını görür
        if current_user.role == UserRole.STUDENT:
            filters["submitted_by"] = current_user.id

        reports, total = self.repo.get_many(
            filters=filters,
            search=params.search,
            search_fields=["content"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [self._to_response(r) for r in reports]

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

        return self._to_response(report)

    def update_report(self, report_id: UUID, data: ReportUpdate, current_user: User) -> ReportResponse:
        """Raporu günceller. Sadece DRAFT raporlar ve sadece sahip güncelleyebilir."""
        report = self.repo.get_by_id_or_404(report_id)
        validate_report_owner(report, current_user)
        validate_report_editable(report)

        if data.youtube_url:
            validate_youtube_url(data.youtube_url)

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(report_id, update_data)
        return self._to_response(updated)

    def submit_report(self, report_id: UUID, current_user: User) -> ReportResponse:
        """Raporu teslim eder: DRAFT → SUBMITTED. Ders gereksinimlerini kontrol eder."""
        report = self.repo.get_by_id_or_404(report_id)
        validate_report_owner(report, current_user)
        validate_report_submittable(report)

        # Ders gereksinimlerini kontrol et
        self._validate_course_requirements(report)

        updated = self.repo.update(report_id, {"status": ReportStatus.SUBMITTED})
        log_activity(self.db, ActivityAction.REPORT_SUBMIT, user_id=current_user.id,
                     entity_type=EntityType.REPORT, entity_id=report_id,
                     details={"week_number": report.week_number, "year": report.year})
        return self._to_response(updated)

    def _validate_course_requirements(self, report) -> None:
        """Projenin bağlı olduğu dersin rapor gereksinimlerini kontrol eder."""
        project = self.db.query(Project).filter(Project.id == report.project_id).first()
        if not project or not project.course_id:
            return  # Derse bağlı değilse gereksinim yok

        course = self.db.query(Course).filter(Course.id == project.course_id).first()
        if not course:
            return

        from app.common.exceptions import BadRequestException

        if course.require_youtube and not report.youtube_url:
            raise BadRequestException(
                f"'{course.name}' dersi için raporda YouTube video linki zorunludur."
            )

        if course.require_file:
            file_repo = FileRepo(self.db)
            files, count = file_repo.get_many(filters={"report_id": report.id})
            if count == 0:
                raise BadRequestException(
                    f"'{course.name}' dersi için rapora en az bir dosya eklenmesi zorunludur."
                )

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
        
        log_activity(self.db, ActivityAction.REPORT_REVIEW, user_id=current_user.id,
                     entity_type=EntityType.REPORT, entity_id=report_id,
                     details={"reviewer_note": data.reviewer_note, "week_number": report.week_number})
        # Raporu gönderen öğrenciye bildirim
        send_notification(
            db=self.db,
            user_id=report.submitted_by,
            type=NotificationType.REPORT_REVIEWED,
            title="Raporunuz İncelendi",
            message=f"{report.year} Yılı {report.week_number}. Hafta raporunuz öğretmen tarafından incelendi.",
            related_id=report.id
        )
        
        return self._to_response(updated)
