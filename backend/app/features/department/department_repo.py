"""
Department Repository (veri erişim) modülü.

BaseRepository'den türer — standart CRUD zaten hazır.
Bölüme özgü sorgular burada tanımlanır.
"""

from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.features.department.department_model import Department


class DepartmentRepo(BaseRepository[Department]):

    def __init__(self, db: Session):
        super().__init__(Department, db)

    def get_by_name(self, name: str) -> Department | None:
        """Bölüm adına göre kayıt getirir (duplicate kontrolü için)."""
        return (
            self.db.query(Department)
            .filter(Department.name == name.strip())
            .filter(Department.is_active == True)
            .first()
        )

    def name_exists(self, name: str) -> bool:
        """Verilen bölüm adı zaten kayıtlı mı kontrol eder."""
        return self.get_by_name(name) is not None
