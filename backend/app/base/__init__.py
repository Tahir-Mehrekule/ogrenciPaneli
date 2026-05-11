"""
Base modül paketi.

Tüm feature katmanlarının türeyeceği temel (base) sınıfları içerir.
Bu sınıflar ortak CRUD, model yapısı, DTO şemaları ve iş mantığı temellerini sağlar.

İçerik:
- BaseModel / NamedBaseModel: SQLAlchemy model base sınıfları
- BaseRepository: Generic CRUD repository
- BaseService: Generic iş mantığı katmanı
- BaseManager: Validasyon ve yardımcı işlemler katmanı
- BaseResponse, PaginatedResponse, FilterParams, MessageResponse: DTO base sınıfları
"""

from app.base.base_model import BaseModel, NamedBaseModel
from app.base.base_dto import BaseResponse, PaginatedResponse, FilterParams, MessageResponse
from app.base.base_repo import BaseRepository
from app.base.base_service import BaseService
from app.base.base_manager import BaseManager

__all__ = [
    "BaseModel",
    "NamedBaseModel",
    "BaseResponse",
    "PaginatedResponse",
    "FilterParams",
    "MessageResponse",
    "BaseRepository",
    "BaseService",
    "BaseManager",
]
