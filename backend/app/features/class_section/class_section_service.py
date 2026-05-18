"""
ClassSection Service.

CRUD + stats (grade_label'a göre öğrenci/şube sayımı).
"""

import math
from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session

from app.base.base_dto import PaginatedResponse
from app.base.base_service import BaseService
from app.common.exceptions import ConflictException, NotFoundException
from app.features.class_section.class_section_model import ClassSection
from app.features.class_section.class_section_repo import ClassSectionRepo
from app.features.class_section.class_section_dto import (
    ClassSectionCreate,
    ClassSectionUpdate,
    ClassSectionResponse,
    ClassSectionStats,
)
from app.features.auth.auth_model import User
from app.common.enums import UserRole


class ClassSectionService(BaseService[ClassSection, ClassSectionRepo]):

    def __init__(self, db: Session):
        super().__init__(ClassSectionRepo, db)

    def _to_response(self, cs: ClassSection) -> ClassSectionResponse:
        data = ClassSectionResponse.model_validate(cs)
        if cs.department:
            data.department_name = cs.department.name
        return data

    def create(self, data: ClassSectionCreate) -> ClassSectionResponse:
        if self.repo.find_combination(data.department_id, data.grade_label, data.branch_code):
            raise ConflictException(
                f"Bu kombinasyon zaten kayıtlı: {data.grade_label} - {data.branch_code} şubesi"
            )
        cs = self.repo.create({
            "department_id": data.department_id,
            "grade_label": data.grade_label.strip(),
            "branch_code": data.branch_code.strip(),
            "capacity": data.capacity,
        })
        return self._to_response(cs)

    def list(
        self, page: int = 1, size: int = 100,
        department_id: Optional[UUID] = None,
        grade_label: Optional[str] = None,
    ) -> PaginatedResponse:
        filters = {}
        if department_id is not None:
            filters["department_id"] = department_id
        if grade_label is not None:
            filters["grade_label"] = grade_label

        items, total = self.repo.get_many(
            filters=filters or None,
            page=page, size=size,
            sort_by="grade_label", order="asc",
        )
        return PaginatedResponse(
            items=[self._to_response(c) for c in items],
            total=total, page=page, size=size,
            pages=math.ceil(total / size) if size > 0 else 0,
        )

    def get(self, cs_id: UUID) -> ClassSectionResponse:
        cs = self.repo.get_by_id_or_404(cs_id)
        return self._to_response(cs)

    def update(self, cs_id: UUID, data: ClassSectionUpdate) -> ClassSectionResponse:
        cs = self.repo.get_by_id_or_404(cs_id)
        update_data = data.model_dump(exclude_none=True)
        # Eğer grade/branch değişiyorsa duplicate kontrolü
        new_grade = update_data.get("grade_label", cs.grade_label)
        new_branch = update_data.get("branch_code", cs.branch_code)
        if (new_grade != cs.grade_label or new_branch != cs.branch_code):
            existing = self.repo.find_combination(cs.department_id, new_grade, new_branch)
            if existing and existing.id != cs_id:
                raise ConflictException(
                    f"Bu kombinasyon zaten kayıtlı: {new_grade} - {new_branch}"
                )
        updated = self.repo.update(cs_id, update_data)
        return self._to_response(updated)

    def delete(self, cs_id: UUID) -> None:
        self.repo.soft_delete(cs_id)

    def get_stats(
        self, grade_label: str, department_id: Optional[UUID] = None,
    ) -> ClassSectionStats:
        """
        Verilen sınıf düzeyinde istatistik:
        - student_count: User.grade_label == grade_label olan aktif STUDENT sayısı
          (department_id verilirse o bölümün öğrencileri)
        - section_count + sections: class_sections tablosundan branch_code listesi
        """
        from app.features.user_department.user_department_model import UserDepartment

        q = (
            self.db.query(User)
            .filter(User.role == UserRole.STUDENT)
            .filter(User.grade_label == grade_label)
            .filter(User.is_active == True)
            .filter(User.is_deleted == False)
        )
        if department_id is not None:
            q = (
                q.join(UserDepartment, UserDepartment.user_id == User.id)
                 .filter(UserDepartment.department_id == department_id)
                 .filter(UserDepartment.is_active == True)
                 .filter(UserDepartment.is_deleted == False)
            )
        student_count = q.count()

        sections = self.repo.list_distinct_branches(grade_label, department_id)
        return ClassSectionStats(
            grade_label=grade_label,
            student_count=student_count,
            section_count=len(sections),
            sections=sections,
        )
