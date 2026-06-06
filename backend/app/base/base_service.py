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
from app.base.base_manager import BaseManager

ModelType = TypeVar("ModelType")
RepoType = TypeVar("RepoType", bound=BaseRepository)


class BaseService(BaseManager, Generic[ModelType, RepoType]):
    """
    Generic service sınıfı.
    Tüm feature service'leri bu sınıftan türer.

    BaseManager'dan türediği için yetkilendirme kısayolları (ids_equal, is_owner,
    require_admin, require_owner_or_admin, require_course_owner_if_teacher) hazır gelir.

    Kullanım:
        class ProjectService(BaseService[Project, ProjectRepo]):
            def __init__(self, db: Session):
                super().__init__(ProjectRepo, db)
    """

    def __init__(self, repo_class: Type[RepoType], db: Session):
        super().__init__(db)
        self.repo: RepoType = repo_class(db)

    def create(self, data: dict) -> ModelType:
        """Yeni kayıt oluşturur."""
        return self.repo.create(data)

    def get(self, id: UUID) -> ModelType:
        """ID ile kayıt getirir. Bulunamazsa 404 fırlatır."""
        return self.repo.get_by_id_or_404(id)

    @staticmethod
    def paginate(items: list, total: int, page: int, size: int) -> PaginatedResponse:
        """
        Sorgu sonucunu standart PaginatedResponse'a çevirir; sayfa sayısını hesaplar.
        Tüm servisler liste dönerken bunu kullanmalı (DRY — tek kaynak).
        """
        return PaginatedResponse(
            items=items, total=total, page=page, size=size,
            pages=math.ceil(total / size) if size > 0 else 0,
        )

    def list(self, filters: FilterParams) -> PaginatedResponse:
        """Sayfalanmış, sıralı, filtreli liste döner."""
        skip = (filters.page - 1) * filters.size
        items = self.repo.get_all(
            skip=skip, limit=filters.size,
            sort_by=filters.sort_by, order=filters.order,
        )
        total = self.repo.count()
        return self.paginate(items, total, filters.page, filters.size)

    def update(self, id: UUID, data: dict) -> ModelType:
        """Kısmi güncelleme (PATCH). None alanlar güncellenmez."""
        update_data = {k: v for k, v in data.items() if v is not None}
        return self.repo.update(id, update_data)

    def delete(self, id: UUID, cascade: bool = True) -> None:
        """Kalıcı silme — kaydı ve ilişkili tüm verilerle DB'den tamamen kaldırır."""
        return self.repo.delete(id, cascade=cascade)

