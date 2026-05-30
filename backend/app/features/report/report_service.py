"""
Report service (iş mantığı) modülü.

Haftalık rapor oluşturma, güncelleme, teslim ve inceleme işlemlerinin orkestrasyon katmanı.
"""

import math
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.base.base_dto import PaginatedResponse
from app.base.base_service import BaseService
from app.common.enums import ReportStatus, UserRole, NotificationType, ActivityAction, EntityType
from app.common.notification_helper import send_notification
from app.common.activity_log_helper import log_activity
from app.common.exceptions import ForbiddenException, NotFoundException
from app.common.validators import validate_youtube_url
from app.features.report.report_model import Report
from app.features.report.report_repo import ReportRepo
from app.features.report.report_manager import ReportManager
from app.features.report.report_dto import (
    ReportCreate, ReportUpdate, ReviewRequest, ReportResponse, ReportFilterParams,
)
from app.features.auth.auth_model import User
from app.features.project.project_model import Project
from app.features.course.course_model import Course
from app.features.file.file_repo import FileRepo


class ReportService(BaseService[Report, ReportRepo]):
    """Haftalık rapor yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        super().__init__(ReportRepo, db)
        self.manager = ReportManager(db)

    def _enrich_with_course(self, report, response: ReportResponse) -> ReportResponse:
        """Rapor response'una ders bilgisini ekler (report → project → course)."""
        try:
            project = report.project
            if project:
                response.project_title = project.title
                if project.course_id:
                    response.course_id = project.course_id
                    course = project.course
                    if course:
                        response.course_name = course.name
                        response.course_code = course.code
        except Exception:
            pass
        # Raporu gönderen öğrencinin adı (report → author)
        try:
            if report.author:
                response.submitted_by_name = report.author.full_name
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

        week_number, year = self.manager.get_current_week_and_year()
        self.manager.validate_weekly_uniqueness(
            data.project_id, current_user.id, week_number, year
        )

        # Race condition koruması: uq_report_weekly constraint → IntegrityError → 409.
        # İki eş zamanlı istek her ikisi de validate_weekly_uniqueness'tan geçebilir;
        # DB constraint ikincisini reddeder — biz 500 yerine 409 döneriz.
        try:
            report = self.repo.create({
                "project_id": data.project_id,
                "submitted_by": current_user.id,
                "week_number": week_number,
                "year": year,
                "content": data.content,
                "youtube_url": data.youtube_url,
                "status": ReportStatus.DRAFT,
            })
        except IntegrityError:
            self.db.rollback()
            from app.common.exceptions import ConflictException
            raise ConflictException(
                f"{year} yılının {week_number}. haftası için rapor zaten mevcut"
            )
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

        # TEACHER sadece kendi derslerine ait raporları görür.
        # (report → project → course.teacher_id == teacher)
        course_ids = None
        if current_user.role == UserRole.TEACHER:
            rows = (
                self.db.query(Course.id)
                .filter(
                    Course.teacher_id == current_user.id,
                    Course.is_deleted == False,
                    Course.is_active == True,
                )
                .all()
            )
            teacher_course_ids = [row.id for row in rows]
            if not teacher_course_ids:
                return PaginatedResponse(
                    items=[], total=0, page=params.page,
                    size=params.size, pages=0,
                )
            # Açık ders filtresi verildiyse, o dersin öğretmene ait olduğunu doğrula
            if params.course_id and params.course_id not in teacher_course_ids:
                return PaginatedResponse(
                    items=[], total=0, page=params.page,
                    size=params.size, pages=0,
                )
            # Açık filtre yoksa tüm kendi derslerine kısıtla
            if not params.course_id:
                course_ids = teacher_course_ids

        # Admin Plan: TEACHER ve ADMIN için DRAFT raporlar default GİZLİ.
        # Sadece sahip öğrenci kendi DRAFT'ını görür.
        in_filters = None
        if current_user.role in (UserRole.TEACHER, UserRole.ADMIN):
            if filters.get("status") == ReportStatus.DRAFT:
                # Staff DRAFT istemiş → erken-dönüş ile boş set
                return PaginatedResponse(
                    items=[], total=0, page=params.page,
                    size=params.size, pages=0,
                )
            if "status" not in filters:
                # status filtresi yoksa SUBMITTED + REVIEWED ile sınırla
                in_filters = {"status": [ReportStatus.SUBMITTED, ReportStatus.REVIEWED]}

        reports, total = self.repo.get_many_filtered(
            filters=filters,
            in_filters=in_filters,
            search=params.search,
            search_fields=["content"],
            grade_label=params.grade_label,
            branch_code=params.branch_code,
            course_id=params.course_id,
            course_ids=course_ids,
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

    def _teacher_owns_report_course(self, report, teacher: User) -> bool:
        """Rapor → proje → ders.teacher_id, öğretmenin kendisi mi?"""
        project = self.db.query(Project).filter(Project.id == report.project_id).first()
        if not project or not project.course_id:
            return False
        course = self.db.query(Course).filter(Course.id == project.course_id).first()
        return bool(course and str(course.teacher_id) == str(teacher.id))

    def get_report(self, report_id: UUID, current_user: User) -> ReportResponse:
        """
        Rapor detayı.
        - STUDENT sadece kendi raporunu görebilir.
        - TEACHER sadece kendi dersinin raporunu görebilir.
        """
        report = self.repo.get_by_id_or_404(report_id)

        if (
            current_user.role == UserRole.STUDENT
            and str(report.submitted_by) != str(current_user.id)
        ):
            raise ForbiddenException("Bu raporu görüntüleme yetkiniz yok")

        if (
            current_user.role == UserRole.TEACHER
            and not self._teacher_owns_report_course(report, current_user)
        ):
            raise ForbiddenException("Bu rapor sizin derslerinize ait değil")

        return self._to_response(report)

    def update_report(self, report_id: UUID, data: ReportUpdate, current_user: User) -> ReportResponse:
        """Raporu günceller. Sadece DRAFT raporlar ve sadece sahip güncelleyebilir."""
        report = self.repo.get_by_id_or_404(report_id)
        self.manager.validate_report_owner(report, current_user)
        self.manager.validate_report_editable(report)

        if data.youtube_url:
            validate_youtube_url(data.youtube_url)

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = self.repo.update(report_id, update_data)
        return self._to_response(updated)

    def submit_report(self, report_id: UUID, current_user: User) -> ReportResponse:
        """Raporu teslim eder: DRAFT → SUBMITTED. Ders gereksinimlerini kontrol eder."""
        report = self.repo.get_by_id_or_404(report_id)
        self.manager.validate_report_owner(report, current_user)
        self.manager.validate_report_submittable(report)

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

    def delete_report(self, report_id: UUID, current_user: User) -> dict:
        """
        Raporu soft delete eder (is_deleted=True).

        Yetki:
        - STUDENT: sadece kendi DRAFT raporunu silebilir
        - TEACHER/ADMIN: tüm raporları silebilir
        """
        from app.common.exceptions import BadRequestException
        report = self.repo.get_by_id_or_404(report_id)

        if current_user.role == UserRole.STUDENT:
            if str(report.submitted_by) != str(current_user.id):
                raise ForbiddenException("Bu raporu silme yetkiniz yok")
            if report.status != ReportStatus.DRAFT:
                raise BadRequestException("Sadece DRAFT raporlar silinebilir")

        self.repo.soft_delete(report_id)
        log_activity(self.db, ActivityAction.REPORT_DELETE, user_id=current_user.id,
                     entity_type=EntityType.REPORT, entity_id=report_id,
                     details={"week_number": report.week_number, "year": report.year})
        return {"message": f"{report.year} - {report.week_number}. hafta raporu silindi"}

    def hard_delete_report(self, report_id: UUID, current_user: User) -> dict:
        """Raporu kalıcı siler. Sadece ADMIN."""
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Bu işlem sadece adminler tarafından yapılabilir")
        report = self.repo.get_by_id_or_404(report_id, active_only=False)
        self.repo.delete(report_id)
        log_activity(self.db, ActivityAction.REPORT_DELETE, user_id=current_user.id,
                     entity_type=EntityType.REPORT, entity_id=report_id,
                     details={"week_number": report.week_number, "year": report.year, "permanent": True})
        return {"message": f"{report.year} - {report.week_number}. hafta raporu kalıcı olarak silindi"}

    def restore_report(self, report_id: UUID, current_user: User) -> ReportResponse:
        """Silinmiş raporu geri yükler. Sadece ADMIN."""
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Bu işlem sadece adminler tarafından yapılabilir")
        restored = self.repo.restore(report_id)
        return self._to_response(restored)

    def get_cascade_info(self, report_id: UUID, current_user: User) -> dict:
        """
        Soft delete öncesi etkilenecek bağlı kayıtların sayısını döner.
        Reports için tek child entity: yüklenen dosyalar.
        """
        report = self.repo.get_by_id_or_404(report_id)
        # Yetki: student sadece kendi raporu için sorabilir
        if (
            current_user.role == UserRole.STUDENT
            and str(report.submitted_by) != str(current_user.id)
        ):
            raise ForbiddenException("Bu rapor için bilgi alma yetkiniz yok")

        _, file_count = FileRepo(self.db).get_many(filters={"report_id": report_id})
        return {"files": file_count}

    def review_report(self, report_id: UUID, data: ReviewRequest, current_user: User) -> ReportResponse:
        """
        Raporu inceler ve geri bildirim ekler: SUBMITTED → REVIEWED.
        Sadece TEACHER/ADMIN yapabilir.
        """
        report = self.repo.get_by_id_or_404(report_id)

        # TEACHER sadece kendi dersinin raporunu inceleyebilir (ADMIN muaf)
        if (
            current_user.role == UserRole.TEACHER
            and not self._teacher_owns_report_course(report, current_user)
        ):
            raise ForbiddenException("Bu rapor sizin derslerinize ait değil")

        if report.status != ReportStatus.SUBMITTED:
            from app.common.exceptions import BadRequestException
            raise BadRequestException(
                f"Sadece SUBMITTED raporlar incelenebilir. Mevcut durum: {report.status.value}"
            )

        from datetime import datetime, timezone
        updated = self.repo.update(report_id, {
            "status": ReportStatus.REVIEWED,
            "reviewer_note": data.reviewer_note,
            "teacher_reviewed_at": datetime.now(timezone.utc),
            "teacher_reviewed_by": current_user.id,
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
