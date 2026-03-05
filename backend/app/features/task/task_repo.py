"""
Task repository (veri erişim) modülü.

Task tablosu için filtreleme ve arama sorgularını tanımlar.
BaseRepository[Task]'dan türer — CRUD otomatik gelir.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.common.pagination import apply_search, apply_sorting, apply_pagination
from app.features.task.task_model import Task
from app.features.task.task_dto import TaskFilterParams


class TaskRepo(BaseRepository[Task]):
    """
    Task tablosu için repository.

    Ek sorgular:
    - get_by_project: Projedeki tüm görevler
    - get_by_assignee: Kullanıcıya atanan görevler
    - get_filtered: Tüm filtreleri birleştirir + sayfalama
    """

    def __init__(self, db: Session):
        super().__init__(Task, db)

    def get_by_project(self, project_id: UUID) -> list[Task]:
        """Projedeki tüm aktif görevleri getirir."""
        return (
            self.db.query(Task)
            .filter(Task.project_id == project_id)
            .filter(Task.is_active == True)
            .all()
        )

    def get_by_assignee(self, user_id: UUID) -> list[Task]:
        """Belirli kullanıcıya atanmış aktif görevleri getirir."""
        return (
            self.db.query(Task)
            .filter(Task.assigned_to == user_id)
            .filter(Task.is_active == True)
            .all()
        )

    def get_filtered(
        self,
        params: TaskFilterParams,
        project_ids: list[UUID] = None,
    ) -> tuple[list[Task], int]:
        """
        Tüm filtreleri uygulayarak görevleri getirir.

        Args:
            params: Filtreleme + sayfalama parametreleri
            project_ids: İzin verilen proje ID'leri (STUDENT için kısıtlama)

        Returns:
            tuple[list[Task], int]: (görev listesi, toplam sayı)
        """
        query = self.db.query(Task).filter(Task.is_active == True)

        # STUDENT için proje kısıtlaması
        if project_ids is not None:
            query = query.filter(Task.project_id.in_(project_ids))

        # Proje filtresi
        if params.project_id is not None:
            query = query.filter(Task.project_id == params.project_id)

        # Atanan kişi filtresi
        if params.assigned_to is not None:
            query = query.filter(Task.assigned_to == params.assigned_to)

        # Durum filtresi
        if params.status is not None:
            query = query.filter(Task.status == params.status)

        # AI önerisi filtresi
        if params.ai_suggested is not None:
            query = query.filter(Task.ai_suggested == params.ai_suggested)

        # Başlık araması
        if params.search:
            query = apply_search(query, Task, params.search, ["title", "description"])

        total = query.count()
        query = apply_sorting(query, Task, params.sort_by, params.order)
        query = apply_pagination(query, params.page, params.size)

        return query.all(), total
