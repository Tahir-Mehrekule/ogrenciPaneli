"""
Admin DTO (Data Transfer Object) modülü.
"""

from typing import List, Optional
from pydantic import BaseModel


class SystemStatsResponse(BaseModel):
    """Sistem genel istatistik yanıtı."""
    total_users: int
    total_projects: int
    total_courses: int
    total_tasks: int
    completed_tasks: int
    total_reports: int
    total_files: int
    total_active_tasks: int
    total_open_reports: int


# ── Detaylı İstatistik Breakdown DTO'ları ──

class RoleBreakdown(BaseModel):
    """Kullanıcı rol dağılımı."""
    students: int = 0
    teachers: int = 0
    admins: int = 0

class ProjectStatusBreakdown(BaseModel):
    """Proje durum dağılımı."""
    draft: int = 0
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    in_progress: int = 0
    completed: int = 0

class TaskStatusBreakdown(BaseModel):
    """Görev durum dağılımı."""
    todo: int = 0
    in_progress: int = 0
    review: int = 0
    done: int = 0

class ReportStatusBreakdown(BaseModel):
    """Rapor durum dağılımı."""
    draft: int = 0
    submitted: int = 0
    reviewed: int = 0

class DetailedStatsResponse(BaseModel):
    """Detaylı sistem istatistikleri — dağılımlar ve oranlar."""
    total_users: int
    total_projects: int
    total_courses: int
    total_tasks: int
    total_reports: int
    total_files: int
    total_enrollments: int

    role_breakdown: RoleBreakdown
    project_breakdown: ProjectStatusBreakdown
    task_breakdown: TaskStatusBreakdown
    report_breakdown: ReportStatusBreakdown

    task_completion_rate: float
    report_review_rate: float
    
class AdminUserResponse(BaseModel):
    """Admin kullanıcı listesi için basit yanıt modeli."""
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: str

class AdminProjectResponse(BaseModel):
    """Admin proje listesi için basit yanıt modeli."""
    id: str
    title: str
    status: str
    created_by: str
    is_active: bool
    created_at: str
