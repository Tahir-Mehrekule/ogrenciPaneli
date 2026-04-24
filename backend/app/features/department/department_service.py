"""
Department Service (iş mantığı) modülü.

CRUD işlemleri + duplicate kontrolü.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.exceptions import ConflictException, NotFoundException
from app.features.department.department_model import Department
from app.features.department.department_repo import DepartmentRepo
from app.features.department.department_dto import DepartmentCreate, DepartmentUpdate, DepartmentResponse


class DepartmentService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = DepartmentRepo(db)

    def create(self, data: DepartmentCreate) -> DepartmentResponse:
        """Yeni bölüm oluşturur. Aynı isimde bölüm varsa hata fırlatır."""
        name = data.name.strip()
        if self.repo.name_exists(name):
            raise ConflictException(f"'{name}' bölümü zaten mevcut")
        department = self.repo.create({"name": name})
        return DepartmentResponse.model_validate(department)

    def list_all(self) -> list[DepartmentResponse]:
        """Tüm aktif bölümleri isme göre sıralı listeler."""
        departments = self.repo.get_all(sort_by="name", order="asc", limit=500)
        return [DepartmentResponse.model_validate(d) for d in departments]

    def get(self, department_id: UUID) -> DepartmentResponse:
        """ID ile bölüm getirir."""
        department = self.repo.get_by_id_or_404(department_id)
        return DepartmentResponse.model_validate(department)

    def update(self, department_id: UUID, data: DepartmentUpdate) -> DepartmentResponse:
        """Bölüm adını günceller. Yeni isim çakışıyorsa hata fırlatır."""
        update_data = data.model_dump(exclude_none=True)
        if "name" in update_data:
            name = update_data["name"].strip()
            existing = self.repo.get_by_name(name)
            if existing and existing.id != department_id:
                raise ConflictException(f"'{name}' bölümü zaten mevcut")
            update_data["name"] = name
        department = self.repo.update(department_id, update_data)
        return DepartmentResponse.model_validate(department)

    def delete(self, department_id: UUID) -> None:
        """Bölümü soft-delete ile pasif yapar."""
        self.repo.delete(department_id)
