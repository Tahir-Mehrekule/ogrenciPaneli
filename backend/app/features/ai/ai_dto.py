"""
AI DTO (Data Transfer Object) modülü.

OpenRouter API görev önerisi için request/response şemalarını tanımlar.
"""

from uuid import UUID
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class AITaskSuggestion(BaseModel):
    """
    Tek bir AI görev önerisi.
    OpenRouter API yanıtından parse edilir.
    """
    title: str = Field(description="Görev başlığı")
    description: str = Field(description="Görev açıklaması")
    estimated_days: Optional[int] = Field(
        default=None, description="Tahmini tamamlanma süresi (gün)"
    )
    priority: Optional[str] = Field(
        default="medium",
        description="Öncelik: low, medium, high"
    )


class AISuggestRequest(BaseModel):
    """AI görev önerisi isteği."""
    project_id: UUID = Field(description="Öneri istenecek projenin UUID'si")


class AISuggestResponse(BaseModel):
    """AI görev önerisi response'u."""
    project_id: UUID
    tasks: List[AITaskSuggestion] = Field(description="Önerilen görevler listesi")
    generated_at: datetime = Field(description="Önerinin oluşturulma tarihi")
    model_used: str = Field(description="Kullanılan AI modeli")


class ReportAnalysisRequest(BaseModel):
    """Rapor analiz (özetleme) isteği."""
    report_id: UUID = Field(description="Analiz edilecek raporun UUID'si")


class ReportAnalysisResponse(BaseModel):
    """Rapor analiz (özetleme) response'u JSON formatında."""
    report_id: UUID
    summary: str = Field(description="Raporun genel özeti")
    strengths: List[str] = Field(description="Projenin ve raporun güçlü yönleri", default_factory=list)
    weaknesses: List[str] = Field(description="Gelişime açık yönler ve eksikler", default_factory=list)
    recommendations: List[str] = Field(description="Gelecek haftalar için tavsiyeler", default_factory=list)
    generated_at: datetime = Field(description="Önerinin oluşturulma tarihi")
    model_used: str = Field(description="Kullanılan AI modeli")
