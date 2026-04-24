from uuid import UUID
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.features.student_prefix.student_prefix_dto import PrefixCreate, PrefixResponse, PrefixUpdate
from app.features.student_prefix.student_prefix_repo import StudentPrefixRepo
from app.features.auth.auth_model import User


class StudentPrefixService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = StudentPrefixRepo(db)

    def list_all(self) -> list[PrefixResponse]:
        return [PrefixResponse.model_validate(p) for p in self.repo.get_all_active()]

    def create(self, data: PrefixCreate, current_user: User) -> PrefixResponse:
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Sadece admin prefix ekleyebilir")

        if self.repo.get_by_prefix(data.prefix):
            raise ConflictException(f"'{data.prefix}' prefix'i zaten tanımlı")

        prefix = self.repo.create({
            "prefix": data.prefix,
            "entry_year": data.entry_year,
            "label": data.label,
            "created_by": current_user.id,
        })
        return PrefixResponse.model_validate(prefix)

    def update(self, prefix_id: UUID, data: PrefixUpdate, current_user: User) -> PrefixResponse:
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Sadece admin prefix güncelleyebilir")

        prefix = self.repo.get_by_id_or_404(prefix_id)
        updates = {}
        if data.entry_year is not None:
            updates["entry_year"] = data.entry_year
        if data.label is not None:
            updates["label"] = data.label

        updated = self.repo.update(prefix_id, updates)
        return PrefixResponse.model_validate(updated)

    def delete(self, prefix_id: UUID, current_user: User) -> dict:
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Sadece admin prefix silebilir")

        prefix = self.repo.get_by_id_or_404(prefix_id)
        self.repo.delete(prefix_id)
        return {"message": f"'{prefix.prefix}' prefix'i silindi"}
