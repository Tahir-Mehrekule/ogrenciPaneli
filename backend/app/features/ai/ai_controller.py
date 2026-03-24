"""
AI Controller (API endpoint) modülü.

OpenRouter AI görev önerisi endpoint'lerini tanımlar.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.common.enums import UserRole
from app.features.ai.ai_service import AIService
from app.features.ai.ai_dto import AISuggestRequest, AISuggestResponse, ReportAnalysisRequest, ReportAnalysisResponse


router = APIRouter(
    prefix="/api/v1/ai",
    tags=["AI"],
)


@router.post(
    "/suggest",
    response_model=AISuggestResponse,
    status_code=status.HTTP_200_OK,
    summary="AI görev önerisi üret",
    description=(
        "Belirtilen proje için OpenRouter API kullanarak görev önerisi üretir. "
        "Proje APPROVED veya IN_PROGRESS durumunda olmalıdır. "
        "Sadece TEACHER ve ADMIN kullanabilir."
    ),
)
def suggest_tasks(
    data: AISuggestRequest,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """
    AI görev önerisi üretir ve projeye kaydeder.

    - Proje APPROVED veya IN_PROGRESS olmalıdır
    - Sonuç `ai_task_plan` alanına kaydedilir
    - Sadece TEACHER ve ADMIN kullanabilir
    """
    return AIService(db).suggest_tasks(data, current_user)


@router.get(
    "/tasks/{project_id}",
    response_model=AISuggestResponse,
    summary="Kaydedilmiş AI önerisini getir",
    description=(
        "Proje için daha önce üretilmiş AI görev önerisini getirir. "
        "Yeni API çağrısı yapmaz, kaydedilen veriyi döner."
    ),
)
def get_saved_suggestion(
    project_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Kaydedilmiş AI önerisini getirir. Henüz öneri üretilmemişse 400 döner.
    """
    return AIService(db).get_saved_suggestion(project_id, current_user)


@router.post(
    "/analyze-report",
    response_model=ReportAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Haftalık Raporu Analiz Et",
    description=(
        "Belirtilen öğrenci raporunu AI ile analiz ederek; "
        "özet, güçlü/zayıf yönler ve tavsiyeler üretir. "
        "Sadece rapor sahibi, öğretmen ve admin kullanabilir."
    ),
)
def analyze_report(
    data: ReportAnalysisRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Rapor özetleme ve analiz.
    """
    return AIService(db).analyze_report(data, current_user)
