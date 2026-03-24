"""
Dosya yükleme veritabanı repository'si.
"""

from sqlalchemy.orm import Session
from app.base.base_repo import BaseRepository
from app.features.file.file_model import FileUpload

class FileRepo(BaseRepository[FileUpload]):
    """
    Dosya tablosu veritabanı operasyonları.
    Temel listeleme ve CRUD işlemleri için BaseRepository'i kullanır.
    """
    def __init__(self, db: Session):
        super().__init__(FileUpload, db)
