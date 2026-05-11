"""
Base repository (temel veri erişim) modülü.

Tüm feature repository'lerinin türeyeceği generic CRUD sınıfını tanımlar.
Her feature kendi repo'sunu BaseRepository'den türeterek CRUD kodunu tekrar yazmaz (DRY).

Soft delete: is_deleted=True yapar, ilişkili kayıtları da soft cascade ile siler.
Hard delete: DB'den kalıcı siler, ilişkili kayıtları da hard cascade ile siler.
"""

from uuid import UUID
from typing import TypeVar, Generic, Type
from datetime import datetime, timezone

from sqlalchemy import desc, asc, or_, inspect
from sqlalchemy.orm import Session, RelationshipProperty

from app.base.base_model import BaseModel
from app.common.exceptions import NotFoundException

ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    """
    Generic CRUD repository.
    Tüm feature repo'ları bu sınıftan türer.

    Kullanım:
        class AuthRepo(BaseRepository[User]):
            def __init__(self, db: Session):
                super().__init__(User, db)

    Cascade davranışı:
        soft_delete → ilişkili child kayıtları da is_deleted=True yapar
        hard_delete → ilişkili child kayıtları da DB'den kalıcı siler
    """

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    # ── Yardımcı: Silinmemiş kayıt filtresi ──

    def _not_deleted(self, query):
        """Silinmemiş kayıtları filtreler (is_deleted == False)."""
        return query.filter(self.model.is_deleted == False)

    def _active_filter(self, query, active_only: bool):
        """Aktiflik filtresi uygular."""
        if active_only:
            query = query.filter(self.model.is_active == True)
        return query

    # ── CREATE ──

    def create(self, obj_data: dict) -> ModelType:
        """Yeni kayıt oluşturur."""
        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # ── READ (tek kayıt) ──

    def get_by_id(self, id: UUID, active_only: bool = True) -> ModelType | None:
        """
        ID ile kayıt getirir. Silinmiş kayıtları otomatik hariç tutar.

        Args:
            id: Kayıt UUID'si
            active_only: True ise sadece aktif kayıtları getirir
        """
        query = self._not_deleted(self.db.query(self.model)).filter(self.model.id == id)
        query = self._active_filter(query, active_only)
        return query.first()

    def get_by_id_or_404(self, id: UUID, active_only: bool = True) -> ModelType:
        """ID ile kayıt getirir, bulunamazsa NotFoundException fırlatır."""
        obj = self.get_by_id(id, active_only)
        if obj is None:
            raise NotFoundException(f"{self.model.__name__} bulunamadı: {id}")
        return obj

    # ── READ (liste) ──

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
        active_only: bool = True,
    ) -> list[ModelType]:
        """Tüm kayıtları filtreli, sıralı ve sayfalanmış şekilde getirir."""
        query = self._not_deleted(self.db.query(self.model))
        query = self._active_filter(query, active_only)

        sort_column = getattr(self.model, sort_by, None)
        if sort_column is not None:
            query = query.order_by(
                desc(sort_column) if order == "desc" else asc(sort_column)
            )

        return query.offset(skip).limit(limit).all()

    def get_many(
        self,
        filters: dict = None,
        in_filters: dict = None,
        like_filters: dict = None,
        search: str = None,
        search_fields: list[str] = None,
        page: int = 1,
        size: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
        active_only: bool = True,
    ) -> tuple[list[ModelType], int]:
        """
        Genelleştirilmiş listeleme metodu.
        Filtreleme, arama, sayfalama ve sıralama işlemlerini tek merkezden yapar.

        Args:
            filters: Kesin eşleşme filtreleri. Örn: {"status": "APPROVED"}
            in_filters: IN sorguları. Örn: {"project_id": [uuid1, uuid2]}
            like_filters: ILIKE filtreleri. Örn: {"department": "Bilgisayar"}
            search: Arama terimi
            search_fields: Aranacak alan isimleri
            page: Sayfa numarası (1'den başlar)
            size: Sayfa başına kayıt sayısı
            sort_by: Sıralama alanı
            order: Sıralama yönü ("asc" veya "desc")
            active_only: True ise sadece aktif kayıtlar

        Returns:
            tuple[list[ModelType], int]: (kayıt listesi, toplam kayıt sayısı)
        """
        query = self._not_deleted(self.db.query(self.model))
        query = self._active_filter(query, active_only)

        # Kesin eşleşme filtreleri
        if filters:
            for key, value in filters.items():
                column = getattr(self.model, key, None)
                if column is not None and value is not None:
                    query = query.filter(column == value)

        # IN filtreleri
        if in_filters:
            for key, value_list in in_filters.items():
                column = getattr(self.model, key, None)
                if column is not None and value_list is not None:
                    query = query.filter(column.in_(value_list))

        # ILIKE filtreleri
        if like_filters:
            for key, value in like_filters.items():
                column = getattr(self.model, key, None)
                if column is not None and value is not None:
                    query = query.filter(column.ilike(f"%{value}%"))

        # Arama (birden fazla alanda OR)
        if search and search_fields:
            search_term = f"%{search.strip()}%"
            conditions = []
            for field_name in search_fields:
                column = getattr(self.model, field_name, None)
                if column is not None:
                    conditions.append(column.ilike(search_term))
            if conditions:
                query = query.filter(or_(*conditions))

        total = query.count()

        # Sıralama
        sort_column = getattr(self.model, sort_by, None)
        if sort_column is not None:
            query = query.order_by(
                desc(sort_column) if order == "desc" else asc(sort_column)
            )

        # Sayfalama
        skip = (page - 1) * size
        items = query.offset(skip).limit(size).all()

        return items, total

    def count(self, active_only: bool = True) -> int:
        """Toplam kayıt sayısını döner (silinmişler hariç)."""
        query = self._not_deleted(self.db.query(self.model))
        query = self._active_filter(query, active_only)
        return query.count()

    # ── UPDATE ──

    def update(self, id: UUID, update_data: dict) -> ModelType:
        """
        Kısmi güncelleme (PATCH). Sadece gönderilen alanlar güncellenir.

        Args:
            id: Güncellenecek kayıt UUID'si
            update_data: Güncellenecek alanlar

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        db_obj = self.get_by_id_or_404(id)

        for key, value in update_data.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)

        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # ── DELETE (soft) ──

    def delete(self, id: UUID, cascade: bool = True) -> ModelType:
        """
        Soft delete — is_deleted=True yapar, is_active=False yapar.
        cascade=True ise ilişkili child kayıtları da soft delete yapar.

        Args:
            id: Silinecek kayıt UUID'si
            cascade: True ise child kayıtları da soft siler

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        db_obj = self.get_by_id_or_404(id)
        db_obj.is_deleted = True
        db_obj.is_active = False

        if cascade:
            self._soft_cascade(db_obj)

        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def _soft_cascade(self, parent_obj) -> None:
        """
        Parent'ın tüm relationship'lerindeki child kayıtları soft delete yapar.
        Sadece BaseModel'den türeyen (is_deleted alanı olan) child'lara uygulanır.
        """
        mapper = inspect(type(parent_obj))
        for rel in mapper.relationships:
            if not self._is_cascadable(rel):
                continue

            children = getattr(parent_obj, rel.key)
            if children is None:
                continue

            if not isinstance(children, list):
                children = [children]

            for child in children:
                if hasattr(child, "is_deleted") and not child.is_deleted:
                    child.is_deleted = True
                    child.is_active = False

    # ── DELETE (hard) ──

    def hard_delete(self, id: UUID, cascade: bool = True) -> None:
        """
        Kalıcı silme — kaydı DB'den tamamen kaldırır.
        cascade=True ise ilişkili child kayıtları da kalıcı siler.

        DİKKAT: Bu işlem geri alınamaz!

        Args:
            id: Silinecek kayıt UUID'si
            cascade: True ise child kayıtları da kalıcı siler

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        db_obj = self.get_by_id_or_404(id, active_only=False)

        if cascade:
            self._hard_cascade(db_obj)

        self.db.delete(db_obj)
        self.db.commit()

    def _hard_cascade(self, parent_obj) -> None:
        """
        Parent'ın tüm relationship'lerindeki child kayıtları kalıcı siler.
        Sadece BaseModel'den türeyen child'lara uygulanır.
        """
        mapper = inspect(type(parent_obj))
        for rel in mapper.relationships:
            if not self._is_cascadable(rel):
                continue

            children = getattr(parent_obj, rel.key)
            if children is None:
                continue

            if not isinstance(children, list):
                children = [children]

            for child in children:
                self.db.delete(child)

    # ── Yardımcı ──

    def _is_cascadable(self, rel: RelationshipProperty) -> bool:
        """
        Bir relationship'in cascade için uygun olup olmadığını kontrol eder.
        Sadece bu modelin parent olduğu (child'a bakan) ilişkiler cascade edilir.
        Ters yöndeki (parent'a bakan) ilişkiler atlanır.
        """
        related_model = rel.mapper.class_
        if not issubclass(related_model, BaseModel):
            return False
        if rel.direction.name == "MANYTOONE":
            return False
        return True

    def restore(self, id: UUID) -> ModelType:
        """
        Soft delete yapılmış kaydı geri getirir.
        is_deleted=False, is_active=True yapar.

        Args:
            id: Geri getirilecek kayıt UUID'si

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        query = self.db.query(self.model).filter(
            self.model.id == id,
            self.model.is_deleted == True,
        )
        db_obj = query.first()
        if db_obj is None:
            raise NotFoundException(f"{self.model.__name__} bulunamadı veya zaten aktif: {id}")

        db_obj.is_deleted = False
        db_obj.is_active = True
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
