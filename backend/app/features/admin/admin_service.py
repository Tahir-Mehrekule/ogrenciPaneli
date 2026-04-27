"""
Admin Service (İş mantığı) modülü.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.features.admin.admin_dto import (
    SystemStatsResponse,
    DetailedStatsResponse,
    RoleBreakdown,
    ProjectStatusBreakdown,
    TaskStatusBreakdown,
    ReportStatusBreakdown,
    PendingStudentResponse,
)
from app.features.auth.auth_model import User
from app.features.project.project_model import Project
from app.features.course.course_model import Course, CourseEnrollment
from app.features.task.task_model import Task
from app.features.report.report_model import Report
from app.features.file.file_model import FileUpload
from app.common.enums import UserRole, ProjectStatus, TaskStatus, ReportStatus, ApprovalStatus
from app.common.exceptions import NotFoundException, BadRequestException


def _alive(model):
    """Silinmemiş ve aktif kayıt filtresi döner (DRY helper)."""
    return (model.is_active == True, model.is_deleted == False)


class AdminService:
    """Admin rolüne özel sistem genel operasyonları."""

    def __init__(self, db: Session):
        self.db = db

    def get_pending_students(self) -> list[PendingStudentResponse]:
        """Onay bekleyen öğrencileri listeler (kayıt tarihine göre eskiden yeniye)."""
        from app.features.auth.auth_repo import AuthRepo
        repo = AuthRepo(self.db)
        students = repo.get_pending_students()
        return [
            PendingStudentResponse(
                id=str(s.id),
                email=s.email,
                first_name=s.first_name,
                last_name=s.last_name,
                full_name=s.full_name,
                student_no=s.student_no,
                departments=[ud.department.name for ud in s.user_departments if ud.is_active and not ud.is_deleted and ud.department],
                created_at=s.created_at.isoformat(),
            )
            for s in students
        ]

    def approve_student(self, user_id: str) -> dict:
        """Öğrenci hesabını onaylar (PENDING → APPROVED)."""
        from uuid import UUID
        student = self.db.query(User).filter(
            User.id == UUID(user_id),
            *_alive(User),
        ).first()
        if student is None:
            raise NotFoundException("Öğrenci bulunamadı")
        if student.approval_status != ApprovalStatus.PENDING:
            raise BadRequestException("Bu hesap zaten işleme alınmış")
        student.approval_status = ApprovalStatus.APPROVED
        self.db.commit()
        return {"message": f"'{student.full_name}' hesabı onaylandı. Artık giriş yapabilir."}

    def reject_student(self, user_id: str) -> dict:
        """Öğrenci kaydını reddeder (PENDING → REJECTED)."""
        from uuid import UUID
        student = self.db.query(User).filter(
            User.id == UUID(user_id),
            *_alive(User),
        ).first()
        if student is None:
            raise NotFoundException("Öğrenci bulunamadı")
        if student.approval_status != ApprovalStatus.PENDING:
            raise BadRequestException("Bu hesap zaten işleme alınmış")
        student.approval_status = ApprovalStatus.REJECTED
        self.db.commit()
        return {"message": f"'{student.full_name}' hesabı reddedildi."}

    def get_system_stats(self) -> SystemStatsResponse:
        """Tüm tablolardan sistem istatistiklerini hesaplar."""
        total_users = self.db.query(User).count()
        total_projects = self.db.query(Project).filter(*_alive(Project)).count()
        total_courses = self.db.query(Course).filter(*_alive(Course)).count()
        total_tasks = self.db.query(Task).filter(*_alive(Task)).count()
        completed_tasks = self.db.query(Task).filter(
            Task.status == TaskStatus.DONE,
            *_alive(Task),
        ).count()
        total_reports = self.db.query(Report).filter(*_alive(Report)).count()
        total_files = self.db.query(FileUpload).filter(*_alive(FileUpload)).count()

        total_active_tasks = self.db.query(Task).filter(
            Task.status != TaskStatus.DONE,
            *_alive(Task),
        ).count()
        total_open_reports = self.db.query(Report).filter(
            Report.status != ReportStatus.REVIEWED,
            *_alive(Report),
        ).count()

        return SystemStatsResponse(
            total_users=total_users,
            total_projects=total_projects,
            total_courses=total_courses,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            total_reports=total_reports,
            total_files=total_files,
            total_active_tasks=total_active_tasks,
            total_open_reports=total_open_reports,
        )

    def get_detailed_stats(self) -> DetailedStatsResponse:
        """Detaylı sistem istatistikleri — GROUP BY sorgularıyla dağılımları hesaplar."""
        # ── Toplam sayılar ──
        total_users = self.db.query(User).count()
        total_projects = self.db.query(Project).filter(*_alive(Project)).count()
        total_courses = self.db.query(Course).filter(*_alive(Course)).count()
        total_tasks = self.db.query(Task).filter(*_alive(Task)).count()
        total_reports = self.db.query(Report).filter(*_alive(Report)).count()
        total_files = self.db.query(FileUpload).filter(*_alive(FileUpload)).count()
        total_enrollments = self.db.query(CourseEnrollment).filter(
            *_alive(CourseEnrollment),
        ).count()

        # ── Kullanıcı rol dağılımı ──
        role_rows = (
            self.db.query(User.role, func.count())
            .group_by(User.role)
            .all()
        )
        role_map = {r.value: c for r, c in role_rows}
        role_breakdown = RoleBreakdown(
            students=role_map.get(UserRole.STUDENT.value, 0),
            teachers=role_map.get(UserRole.TEACHER.value, 0),
            admins=role_map.get(UserRole.ADMIN.value, 0),
        )

        # ── Proje durum dağılımı ──
        project_rows = (
            self.db.query(Project.status, func.count())
            .filter(*_alive(Project))
            .group_by(Project.status)
            .all()
        )
        project_map = {s.value: c for s, c in project_rows}
        project_breakdown = ProjectStatusBreakdown(
            draft=project_map.get(ProjectStatus.DRAFT.value, 0),
            pending=project_map.get(ProjectStatus.PENDING.value, 0),
            approved=project_map.get(ProjectStatus.APPROVED.value, 0),
            rejected=project_map.get(ProjectStatus.REJECTED.value, 0),
            in_progress=project_map.get(ProjectStatus.IN_PROGRESS.value, 0),
            completed=project_map.get(ProjectStatus.COMPLETED.value, 0),
        )

        # ── Görev durum dağılımı ──
        task_rows = (
            self.db.query(Task.status, func.count())
            .filter(*_alive(Task))
            .group_by(Task.status)
            .all()
        )
        task_map = {s.value: c for s, c in task_rows}
        task_breakdown = TaskStatusBreakdown(
            todo=task_map.get(TaskStatus.TODO.value, 0),
            in_progress=task_map.get(TaskStatus.IN_PROGRESS.value, 0),
            review=task_map.get(TaskStatus.REVIEW.value, 0),
            done=task_map.get(TaskStatus.DONE.value, 0),
        )

        # ── Rapor durum dağılımı ──
        report_rows = (
            self.db.query(Report.status, func.count())
            .filter(*_alive(Report))
            .group_by(Report.status)
            .all()
        )
        report_map = {s.value: c for s, c in report_rows}
        report_breakdown = ReportStatusBreakdown(
            draft=report_map.get(ReportStatus.DRAFT.value, 0),
            submitted=report_map.get(ReportStatus.SUBMITTED.value, 0),
            reviewed=report_map.get(ReportStatus.REVIEWED.value, 0),
        )

        # ── Oranlar ──
        task_completion_rate = round(
            (task_breakdown.done / total_tasks * 100) if total_tasks > 0 else 0, 1
        )
        report_review_rate = round(
            (report_breakdown.reviewed / total_reports * 100) if total_reports > 0 else 0, 1
        )

        return DetailedStatsResponse(
            total_users=total_users,
            total_projects=total_projects,
            total_courses=total_courses,
            total_tasks=total_tasks,
            total_reports=total_reports,
            total_files=total_files,
            total_enrollments=total_enrollments,
            role_breakdown=role_breakdown,
            project_breakdown=project_breakdown,
            task_breakdown=task_breakdown,
            report_breakdown=report_breakdown,
            task_completion_rate=task_completion_rate,
            report_review_rate=report_review_rate,
        )
