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
from app.common import authz

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

    # ── Yetkilendirme kısayolları (app.common.authz'a delege — tek kaynak) ──

    @staticmethod
    def ids_equal(a, b) -> bool:
        """UUID/string id eşitlik kontrolü (tip farkını yok sayar)."""
        return authz.ids_equal(a, b)

    @staticmethod
    def is_owner(entity, owner_field: str, user) -> bool:
        """entity.<owner_field> == user.id mi?"""
        return authz.is_owner(entity, owner_field, user)

    def require_admin(self, user, *, message: str = "Bu işlem sadece adminler tarafından yapılabilir") -> None:
        """ADMIN değilse ForbiddenException fırlatır."""
        authz.require_admin(user, message=message)

    def require_owner_or_admin(self, entity, owner_field: str, user, *, allow_admin: bool = True, entity_name: str = "kayıt") -> None:
        """Sahip değilse (ve allow_admin ise admin değilse) ForbiddenException fırlatır."""
        authz.require_owner_or_admin(entity, owner_field, user, allow_admin=allow_admin, entity_name=entity_name)

    def require_course_owner_if_teacher(self, course, user, *, message: str = "Sadece kendi dersiniz üzerinde işlem yapabilirsiniz") -> None:
        """TEACHER ise dersin sahibi olmalı; ADMIN her zaman geçer."""
        authz.require_course_owner_if_teacher(course, user, message=message)

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
            skip=skip, limit=filters.size,
            sort_by=filters.sort_by, order=filters.order,
        )
        total = self.repo.count()
        return PaginatedResponse(
            items=items, total=total, page=filters.page,
            size=filters.size,
            pages=math.ceil(total / filters.size) if filters.size > 0 else 0,
        )

    def update(self, id: UUID, data: dict) -> ModelType:
        """Kısmi güncelleme (PATCH). None alanlar güncellenmez."""
        update_data = {k: v for k, v in data.items() if v is not None}
        return self.repo.update(id, update_data)

    def delete(self, id: UUID, cascade: bool = True) -> None:
        """Kalıcı silme — kaydı ve ilişkili tüm verilerle DB'den tamamen kaldırır."""
        return self.repo.delete(id, cascade=cascade)

