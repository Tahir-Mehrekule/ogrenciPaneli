"""
Base service (temel iş mantığı) modülü.

Tüm feature service'lerinin türeyeceği generic sınıfı tanımlar.
Service katmanı, repository ile controller arasında iş mantığı yönetir.
Validasyon, yetki kontrolü, birden fazla repo çağrısı gibi işlemler burada yapılır.
"""

import math
from uuid import UUID
from typing import TypeVar, Generic, Type

from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.base.base_dto import PaginatedResponse, FilterParams

ModelType = TypeVar("ModelType")
RepoType = TypeVar("RepoType", bound=BaseRepository)


class BaseService(Generic[ModelType, RepoType]):
    """
    Generic service sınıfı.
    Tüm feature service'leri bu sınıftan türer.

    Kullanım:
        class ProjectService(BaseService[Project, ProjectRepo]):
            def __init__(self, db: Session):
                super().__init__(ProjectRepo, db)
    """

    def __init__(self, repo_class: Type[RepoType], db: Session):
        self.db = db
        self.repo: RepoType = repo_class(db)

    def create(self, data: dict) -> ModelType:
        """Yeni kayıt oluşturur."""
        return self.repo.create(data)

    def get(self, id: UUID) -> ModelType:
        """ID ile kayıt getirir. Bulunamazsa 404 fırlatır."""
        return self.repo.get_by_id_or_404(id)

    def list(self, filters: FilterParams) -> PaginatedResponse:
        """Sayfalanmış, sıralı, filtreli liste döner."""
        skip = (filters.page - 1) * filters.size

        items = self.repo.get_all(
            skip=skip,
            limit=filters.size,
            sort_by=filters.sort_by,
            order=filters.order,
        )
        total = self.repo.count()

        return PaginatedResponse(
            items=items,
            total=total,
            page=filters.page,
            size=filters.size,
            pages=math.ceil(total / filters.size) if filters.size > 0 else 0,
        )

    def update(self, id: UUID, data: dict) -> ModelType:
        """Kısmi güncelleme (PATCH). None alanlar güncellenmez."""
        update_data = {k: v for k, v in data.items() if v is not None}
        return self.repo.update(id, update_data)

    def delete(self, id: UUID, cascade: bool = True) -> ModelType:
        """Soft delete — is_deleted=True, is_active=False yapar. Cascade ile child'ları da siler."""
        return self.repo.delete(id, cascade=cascade)

    def hard_delete(self, id: UUID, cascade: bool = True) -> None:
        """Kalıcı silme — DB'den tamamen kaldırır. Geri alınamaz."""
        return self.repo.hard_delete(id, cascade=cascade)

    def restore(self, id: UUID) -> ModelType:
        """Soft delete yapılmış kaydı geri getirir."""
        return self.repo.restore(id)
