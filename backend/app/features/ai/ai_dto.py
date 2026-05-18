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


# ─────────────── Öğretmen Cevap Önerisi (Paket 4A) ───────────────

FeedbackTone = str  # "constructive" | "encouraging" | "critical"


class FeedbackSuggestRequest(BaseModel):
    """AI cevap önerisi isteği — öğretmen rapor altına yazacağı metin için."""
    report_id: UUID = Field(description="Cevap önerisi istenen raporun UUID'si")
    tone: FeedbackTone = Field(
        default="constructive",
        description="Ton: constructive (yapıcı) | encouraging (cesaret verici) | critical (eleştirel)",
        pattern="^(constructive|encouraging|critical)$",
    )


class FeedbackSuggestResponse(BaseModel):
    """AI cevap önerisi response'u."""
    report_id: UUID
    tone: FeedbackTone
    suggested_feedback: str = Field(description="AI'ın ürettiği geri bildirim taslağı")
    generated_at: datetime
    model_used: str
