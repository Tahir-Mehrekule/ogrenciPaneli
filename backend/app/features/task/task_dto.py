"""
Task DTO (Data Transfer Object) modülü.

Görev oluşturma, güncelleme ve listeleme için request/response şemalarını tanımlar.
"""

from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.common.enums import TaskStatus
from app.common.base_dto import BaseResponse, FilterParams


class TaskCreate(BaseModel):
    """
    Görev oluşturma isteği.
    Yeni görev her zaman TODO statüsünde başlar.
    """
    title: str = Field(min_length=3, max_length=200, description="Görev başlığı")
    description: str = Field(min_length=5, description="Görev açıklaması")
    project_id: UUID = Field(description="Ait olduğu proje")
    assigned_to: Optional[UUID] = Field(default=None, description="Atanan kullanıcı UUID'si")
    due_date: Optional[datetime] = Field(default=None, description="Teslim tarihi")

    @model_validator(mode="after")
    def validate_due_date(self):
        """Teslim tarihi geçmişte olamaz."""
        if self.due_date and self.due_date < datetime.now(self.due_date.tzinfo):
            raise ValueError("Teslim tarihi geçmişte olamaz")
        return self


class TaskUpdate(BaseModel):
    """
    Görev güncelleme isteği (PATCH — kısmi güncelleme).
    Sadece gönderilen alanlar güncellenir.
    """
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, min_length=5)
    assigned_to: Optional[UUID] = Field(default=None, description="Yeni atanan kullanıcı")
    due_date: Optional[datetime] = Field(default=None, description="Yeni teslim tarihi")


class TaskStatusUpdate(BaseModel):
    """
    Görev durumu güncelleme isteği.
    Sadece durum değişikliği yapmak için ayrı endpoint.
    """
    status: TaskStatus = Field(description="Yeni durum")


class TaskResponse(BaseResponse):
    """
    Görev response'u.
    BaseResponse'tan: id, created_at, updated_at
    """
    title: str
    description: str
    project_id: UUID
    assigned_to: Optional[UUID] = None
    status: TaskStatus
    due_date: Optional[datetime] = None
    ai_suggested: bool
    is_active: bool


class TaskFilterParams(FilterParams):
    """
    Görev listesi filtreleme parametreleri.
    FilterParams'tan: page, size, sort_by, order, search
    """
    project_id: Optional[UUID] = Field(default=None, description="Proje filtresi")
    assigned_to: Optional[UUID] = Field(default=None, description="Atanan kullanıcı filtresi")
    status: Optional[TaskStatus] = Field(default=None, description="Durum filtresi")
    ai_suggested: Optional[bool] = Field(default=None, description="AI önerisi filtresi")
