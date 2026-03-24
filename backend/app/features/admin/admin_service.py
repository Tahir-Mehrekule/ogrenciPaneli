"""
Admin Service (İş mantığı) modülü.
"""

from sqlalchemy.orm import Session
from app.features.admin.admin_dto import SystemStatsResponse
from app.features.auth.auth_model import User
from app.features.project.project_model import Project
from app.features.course.course_model import Course
from app.features.task.task_model import Task
from app.features.report.report_model import Report
from app.features.file.file_model import FileUpload
from app.common.enums import TaskStatus

class AdminService:
    """Admin rolüne özel sistem genel operasyonları."""

    def __init__(self, db: Session):
        self.db = db

    def get_system_stats(self) -> SystemStatsResponse:
        """Tüm tablolardan sistem istatistiklerini hesaplar."""
        total_users = self.db.query(User).count()
        total_projects = self.db.query(Project).filter(Project.is_active == True).count()
        total_courses = self.db.query(Course).filter(Course.is_active == True).count()
        total_tasks = self.db.query(Task).filter(Task.is_active == True).count()
        completed_tasks = self.db.query(Task).filter(
            Task.status == TaskStatus.DONE, 
            Task.is_active == True
        ).count()
        total_reports = self.db.query(Report).filter(Report.is_active == True).count()
        total_files = self.db.query(FileUpload).filter(FileUpload.is_active == True).count()

        return SystemStatsResponse(
            total_users=total_users,
            total_projects=total_projects,
            total_courses=total_courses,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            total_reports=total_reports,
            total_files=total_files
        )
