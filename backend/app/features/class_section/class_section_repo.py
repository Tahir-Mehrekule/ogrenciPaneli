"""
ClassSection repository.

BaseRepository[ClassSection]'dan türer; bölüm/sınıf kombinasyonuna özel
küçük yardımcılar burada toplanır.
"""

from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session

from app.base.base_repo import BaseRepository
from app.features.class_section.class_section_model import ClassSection


class ClassSectionRepo(BaseRepository[ClassSection]):

    def __init__(self, db: Session):
        super().__init__(ClassSection, db)

    def find_combination(
        self, department_id: UUID, grade_label: str, branch_code: str,
    ) -> Optional[ClassSection]:
        """(department, grade, branch) üçlüsünde aktif kayıt arar (duplicate kontrolü)."""
        return (
            self.db.query(ClassSection)
            .filter(ClassSection.department_id == department_id)
            .filter(ClassSection.grade_label == grade_label.strip())
            .filter(ClassSection.branch_code == branch_code.strip())
            .filter(ClassSection.is_active == True)
            .filter(ClassSection.is_deleted == False)
            .first()
        )

    def list_distinct_branches(
        self, grade_label: str, department_id: Optional[UUID] = None,
    ) -> list[str]:
        """Verilen sınıfta tanımlı şubelerin (branch_code) sıralı listesi."""
        q = (
            self.db.query(ClassSection.branch_code)
            .filter(ClassSection.grade_label == grade_label.strip())
            .filter(ClassSection.is_active == True)
            .filter(ClassSection.is_deleted == False)
        )
        if department_id is not None:
            q = q.filter(ClassSection.department_id == department_id)
        return sorted({row[0] for row in q.all()})
