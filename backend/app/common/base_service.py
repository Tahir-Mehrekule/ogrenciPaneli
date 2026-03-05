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

from app.common.base_repo import BaseRepository
from app.common.base_dto import PaginatedResponse, FilterParams

# Generic tipler
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

            def approve_project(self, project_id: UUID):
                # Özel iş mantığı...

    Args:
        repo_class: Repository sınıfı (AuthRepo, ProjectRepo vb.)
        db: Veritabanı oturumu
    """

    def __init__(self, repo_class: Type[RepoType], db: Session):
        self.db = db
        self.repo: RepoType = repo_class(db)

    def create(self, data: dict) -> ModelType:
        """
        Yeni kayıt oluşturur.
        Alt sınıflar bu metodu override ederek ek validasyon ekleyebilir.

        Args:
            data: Kayıt verileri

        Returns:
            Oluşturulan kayıt
        """
        return self.repo.create(data)

    def get(self, id: UUID) -> ModelType:
        """
        ID ile kayıt getirir. Bulunamazsa 404 hatası fırlatır.

        Args:
            id: Kayıt UUID'si

        Returns:
            Kayıt objesi

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        return self.repo.get_by_id_or_404(id)

    def list(self, filters: FilterParams) -> PaginatedResponse:
        """
        Sayfalanmış, sıralı, filtreli liste döner.
        PaginatedResponse formatında: items, total, page, size, pages.

        Args:
            filters: Sayfalama/sıralama parametreleri

        Returns:
            PaginatedResponse: Sayfalanmış kayıt listesi
        """
        # Sayfalama hesaplaması
        skip = (filters.page - 1) * filters.size

        # Verileri getir
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
        """
        Kayıt güncelleme (kısmi — PATCH).
        None olan alanlar güncellenmez, sadece gönderilen değerler değişir.

        Args:
            id: Güncellenecek kayıt UUID'si
            data: Güncellenecek alanlar

        Returns:
            Güncellenmiş kayıt

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        # None olan alanları filtrele (sadece gönderilen alanlar güncellenir)
        update_data = {k: v for k, v in data.items() if v is not None}
        return self.repo.update(id, update_data)

    def delete(self, id: UUID) -> ModelType:
        """
        Soft delete — kaydı pasif yapar.

        Args:
            id: Silinecek kayıt UUID'si

        Returns:
            Silinen kayıt

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        return self.repo.delete(id)
