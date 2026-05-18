"""
Department Repository (veri erişim) modülü.

BaseRepository'den türer — standart CRUD zaten hazır.
Bölüme özgü sorgular burada tanımlanır.
"""

from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
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
            .filter(Department.is_deleted == False)
            .first()
        )

    def name_exists(self, name: str) -> bool:
        """Verilen bölüm adı zaten kayıtlı mı kontrol eder."""
        return self.get_by_name(name) is not None

    def get_by_code(self, code: str) -> Department | None:
        """3 haneli koda göre kayıt getirir (duplicate kontrolü ve öğrenci no parser için)."""
        return (
            self.db.query(Department)
            .filter(Department.code == code.strip())
            .filter(Department.is_active == True)
            .filter(Department.is_deleted == False)
            .first()
        )

    def code_exists(self, code: str) -> bool:
        """Verilen 3 haneli bölüm kodu zaten kayıtlı mı kontrol eder."""
        return self.get_by_code(code) is not None
