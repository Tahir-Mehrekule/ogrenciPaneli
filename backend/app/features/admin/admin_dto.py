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
