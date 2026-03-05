"""
AI Service (iş mantığı) modülü.

OpenRouter API görev önerisi akışını orkestre eder.
Proje doğrulama → API çağrısı → Sonucu kaydetme.
"""

from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.common.enums import ProjectStatus, UserRole
from app.common.exceptions import BadRequestException, ForbiddenException
from app.features.project.project_repo import ProjectRepo
from app.features.ai.ai_manager import call_openrouter
from app.features.ai.ai_dto import AISuggestRequest, AISuggestResponse
from app.features.ai.ai_config import DEFAULT_MODEL
from app.features.auth.auth_model import User


class AIService:
    """AI görev önerisi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.project_repo = ProjectRepo(db)

    def suggest_tasks(self, data: AISuggestRequest, current_user: User) -> AISuggestResponse:
        """
        Proje için AI görev önerisi üretir.

        Akış:
        1. Projeyi getir (404 kontrolü)
        2. Proje durumu kontrolü (APPROVED veya IN_PROGRESS olmalı)
        3. Yetki kontrolü (proje sahibi, TEACHER veya ADMIN)
        4. OpenRouter API çağrısı
        5. Sonucu `ai_task_plan` alanına kaydet
        6. AISuggestResponse döner

        Args:
            data: AISuggestRequest (project_id)
            current_user: İsteği yapan kullanıcı

        Returns:
            AISuggestResponse: Önerilen görevler

        Raises:
            NotFoundException: Proje bulunamazsa
            BadRequestException: Proje uygun durumda değilse
            ForbiddenException: Yetki yoksa
            AppException: API başarısız olursa
        """
        # 1. Projeyi getir
        project = self.project_repo.get_by_id_or_404(data.project_id)

        # 2. Durum kontrolü — sadece aktif projelere öneri
        allowed_statuses = [ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS]
        if project.status not in allowed_statuses:
            raise BadRequestException(
                f"AI önerisi sadece APPROVED veya IN_PROGRESS projeler için kullanılabilir. "
                f"Mevcut durum: {project.status.value}"
            )

        # 3. Yetki kontrolü
        is_owner = str(project.created_by) == str(current_user.id)
        is_privileged = current_user.role in [UserRole.TEACHER, UserRole.ADMIN]
        if not is_owner and not is_privileged:
            raise ForbiddenException("Bu proje için AI önerisi üretme yetkiniz yok")

        # 4. OpenRouter API çağrısı
        task_suggestions = call_openrouter(project.title, project.description)

        # 5. Sonucu projeye kaydet
        ai_plan_data = {
            "tasks": [t.model_dump() for t in task_suggestions],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": DEFAULT_MODEL,
        }
        self.project_repo.update(data.project_id, {"ai_task_plan": ai_plan_data})

        # 6. Response döner
        return AISuggestResponse(
            project_id=data.project_id,
            tasks=task_suggestions,
            generated_at=datetime.now(timezone.utc),
            model_used=DEFAULT_MODEL,
        )

    def get_saved_suggestion(self, project_id: UUID, current_user: User) -> AISuggestResponse:
        """
        Projede kaydedilmiş AI önerisini getirir (yeni API çağrısı yapmaz).

        Args:
            project_id: Proje UUID'si

        Returns:
            AISuggestResponse: Kaydedilmiş öneri

        Raises:
            NotFoundException: Proje bulunamazsa
            BadRequestException: Henüz AI önerisi üretilmemişse
        """
        project = self.project_repo.get_by_id_or_404(project_id)

        if not project.ai_task_plan:
            raise BadRequestException(
                "Bu proje için henüz AI görev önerisi üretilmemiş. "
                "Önce POST /ai/suggest endpoint'ini kullanın."
            )

        plan = project.ai_task_plan
        from app.features.ai.ai_dto import AITaskSuggestion
        from datetime import datetime

        tasks = [AITaskSuggestion(**t) for t in plan.get("tasks", [])]
        generated_at = datetime.fromisoformat(plan.get("generated_at", datetime.now(timezone.utc).isoformat()))

        return AISuggestResponse(
            project_id=project_id,
            tasks=tasks,
            generated_at=generated_at,
            model_used=plan.get("model", DEFAULT_MODEL),
        )
