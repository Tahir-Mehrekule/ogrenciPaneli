"""
Base repository (temel veri erişim) modülü.

Tüm feature repository'lerinin türeyeceği generic CRUD sınıfını tanımlar.
Her feature kendi repo'sunu BaseRepository'den türeterek CRUD kodunu tekrar yazmaz (DRY).
"""

from uuid import UUID
from typing import TypeVar, Generic, Type

from sqlalchemy import desc, asc, or_
from sqlalchemy.orm import Session

from app.base.base_model import BaseModel
from app.common.exceptions import NotFoundException

# Generic model tipi — BaseRepository'nin hangi model ile çalışacağını belirler
ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    """
    Generic CRUD repository.
    Tüm feature repo'ları bu sınıftan türer.

    Kullanım:
        class AuthRepo(BaseRepository[User]):
            def __init__(self, db: Session):
                super().__init__(User, db)

            def get_by_email(self, email: str) -> User | None:
                return self.db.query(self.model).filter(self.model.email == email).first()

    Args:
        model: SQLAlchemy model sınıfı (User, Project, Task vb.)
        db: Veritabanı oturumu
    """

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def create(self, obj_data: dict) -> ModelType:
        """
        Yeni kayıt oluşturur.

        Args:
            obj_data: Kayıt verileri (dict formatında)

        Returns:
            Oluşturulan kayıt objesi
        """
        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def get_by_id(self, id: UUID, active_only: bool = True) -> ModelType | None:
        """
        ID ile kayıt getirir.

        Args:
            id: Kayıt UUID'si
            active_only: True ise sadece aktif (silinmemiş) kayıtları getirir

        Returns:
            Kayıt objesi veya None (bulunamazsa)
        """
        query = self.db.query(self.model).filter(self.model.id == id)
        if active_only:
            query = query.filter(self.model.is_active == True)
        return query.first()

    def get_by_id_or_404(self, id: UUID, active_only: bool = True) -> ModelType:
        """
        ID ile kayıt getirir, bulunamazsa 404 hatası fırlatır.

        Args:
            id: Kayıt UUID'si
            active_only: True ise sadece aktif kayıtları getirir

        Returns:
            Kayıt objesi

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        obj = self.get_by_id(id, active_only)
        if obj is None:
            raise NotFoundException(f"{self.model.__name__} bulunamadı: {id}")
        return obj

    def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
        active_only: bool = True,
    ) -> list[ModelType]:
        """
        Tüm kayıtları filtreli, sıralı ve sayfalanmış şekilde getirir.

        Args:
            skip: Atlanacak kayıt sayısı (sayfalama için)
            limit: Getirilecek maksimum kayıt sayısı
            sort_by: Sıralama alanı
            order: Sıralama yönü ("asc" veya "desc")
            active_only: True ise sadece aktif kayıtlar

        Returns:
            Kayıt listesi
        """
        query = self.db.query(self.model)

        if active_only:
            query = query.filter(self.model.is_active == True)

        # Sıralama
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
        Diğer modüller kendi repo'larında ayrıca get_filtered yazmak zorunda kalmaz.

        Args:
            filters: Kesin eşleşme filtreleri (dict). Örn: {"status": "APPROVED", "created_by": uuid}
            in_filters: IN sorguları (dict). Örn: {"project_id": [uuid1, uuid2]}
            like_filters: Kısmi eşleşme filtreleri — ILIKE (dict). Örn: {"department": "Bilgisayar"}
            search: Arama terimi. Örn: "Ali"
            search_fields: Aranacak alan isimleri. Örn: ["title", "description"]
            page: Sayfa numarası (1'den başlar)
            size: Sayfa başına kayıt sayısı
            sort_by: Sıralama alanı
            order: Sıralama yönü ("asc" veya "desc")
            active_only: True ise sadece aktif (silinmemiş) kayıtlar

        Returns:
            tuple[list[ModelType], int]: (kayıt listesi, toplam kayıt sayısı)
        """
        query = self.db.query(self.model)

        # 1. Aktif kayıt filtresi
        if active_only:
            query = query.filter(self.model.is_active == True)

        # 2. Kesin eşleşme filtreleri (== operatörü)
        if filters:
            for key, value in filters.items():
                column = getattr(self.model, key, None)
                if column is not None and value is not None:
                    query = query.filter(column == value)

        # 3. IN filtreleri (column.in_([...]) operatörü)
        if in_filters:
            for key, value_list in in_filters.items():
                column = getattr(self.model, key, None)
                if column is not None and value_list is not None:
                    query = query.filter(column.in_(value_list))

        # 4. ILIKE filtreleri (kısmi eşleşme — %terim%)
        if like_filters:
            for key, value in like_filters.items():
                column = getattr(self.model, key, None)
                if column is not None and value is not None:
                    query = query.filter(column.ilike(f"%{value}%"))

        # 5. Arama (birden fazla alanda OR mantığıyla ILIKE)
        if search and search_fields:
            search_term = f"%{search.strip()}%"
            conditions = []
            for field_name in search_fields:
                column = getattr(self.model, field_name, None)
                if column is not None:
                    conditions.append(column.ilike(search_term))
            if conditions:
                query = query.filter(or_(*conditions))

        # Toplam kayıt sayısı (sayfalama uygulanmadan önce)
        total = query.count()

        # 6. Sıralama
        sort_column = getattr(self.model, sort_by, None)
        if sort_column is not None:
            query = query.order_by(
                desc(sort_column) if order == "desc" else asc(sort_column)
            )

        # 7. Sayfalama
        skip = (page - 1) * size
        items = query.offset(skip).limit(size).all()

        return items, total

    def count(self, active_only: bool = True) -> int:
        """
        Toplam kayıt sayısını döner.

        Args:
            active_only: True ise sadece aktif kayıtları sayar

        Returns:
            Toplam kayıt sayısı
        """
        query = self.db.query(self.model)
        if active_only:
            query = query.filter(self.model.is_active == True)
        return query.count()

    def update(self, id: UUID, update_data: dict) -> ModelType:
        """
        Kayıt güncelleme (kısmi güncelleme — PATCH).
        Sadece gönderilen alanlar güncellenir, diğerleri korunur.

        Args:
            id: Güncellenecek kayıt UUID'si
            update_data: Güncellenecek alanlar (dict formatında)

        Returns:
            Güncellenmiş kayıt objesi

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

    def delete(self, id: UUID) -> ModelType:
        """
        Soft delete — kaydı silmez, is_active=False yapar.
        Veri kaybı olmaz, gerektiğinde geri alınabilir.

        Args:
            id: Silinecek kayıt UUID'si

        Returns:
            Silinen (pasif yapılan) kayıt objesi

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        db_obj = self.get_by_id_or_404(id)
        db_obj.is_active = False
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def hard_delete(self, id: UUID) -> None:
        """
        Kalıcı silme — kaydı veritabanından tamamen kaldırır.
        DİKKAT: Bu işlem geri alınamaz!

        Args:
            id: Silinecek kayıt UUID'si

        Raises:
            NotFoundException: Kayıt bulunamazsa
        """
        db_obj = self.get_by_id_or_404(id, active_only=False)
        self.db.delete(db_obj)
        self.db.commit()
