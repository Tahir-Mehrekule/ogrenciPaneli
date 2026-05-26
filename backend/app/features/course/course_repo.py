"""
Course repository (veri erişim) modülü.

Ders veritabanı işlemleri.
"""

from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.features.course.course_model import Course


class CourseRepo(BaseRepository[Course]):
    """
    Ders CRUD operasyonları.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, get_many, count, update, delete

    get_many ile tüm filtreleme, arama, sayfalama ve sıralama
    işlemleri merkezi olarak yapılır — burada ayrıca yazılmaz (DRY).

    Ek sorgular:
    - get_by_code: Ders koduna göre getir (unique alan — duplicate kontrolü için)
    """

    def __init__(self, db: Session):
        super().__init__(Course, db)

    def get_by_code(self, code: str) -> Course | None:
        """Ders koduna göre getir (unique alan)."""
        return (
            self.db.query(Course)
            .filter(Course.code == code, Course.is_active == True, Course.is_deleted == False)
            .first()
        )
