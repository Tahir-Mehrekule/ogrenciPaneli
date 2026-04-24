"""
ProjectCategory service modülü.

Kurallar:
- Kategori oluşturma: Teacher (sadece kendi dersi) veya Admin
- Kategori silme: İçinde aktif proje varsa 409 — önce taşı veya arşivle
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.features.project_category.project_category_dto import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)
from app.features.project_category.project_category_repo import ProjectCategoryRepo
from app.features.course.course_repo import CourseRepo
from app.features.auth.auth_model import User


class ProjectCategoryService:

    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectCategoryRepo(db)
        self.course_repo = CourseRepo(db)

    def list_by_course(self, course_id: UUID) -> list[CategoryResponse]:
        self.course_repo.get_by_id_or_404(course_id)
        cats = self.repo.get_by_course(course_id)
        return [CategoryResponse.model_validate(c) for c in cats]

    def create(self, course_id: UUID, data: CategoryCreate, current_user: User) -> CategoryResponse:
        course = self.course_repo.get_by_id_or_404(course_id)

        # Yetki: Admin veya dersin teacher'ı
        if current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
            raise ForbiddenException("Kategori oluşturma yetkisi yok")

        if current_user.role == UserRole.TEACHER and str(course.teacher_id) != str(current_user.id):
            raise ForbiddenException("Sadece kendi dersinize kategori ekleyebilirsiniz")

        if self.repo.name_exists(course_id, data.name):
            raise ConflictException(f"Bu ders için '{data.name}' kategorisi zaten mevcut")

        cat = self.repo.create({
            "name": data.name,
            "course_id": course_id,
            "created_by": current_user.id,
            "color": data.color,
        })
        return CategoryResponse.model_validate(cat)

    def update(self, category_id: UUID, data: CategoryUpdate, current_user: User) -> CategoryResponse:
        cat = self.repo.get_by_id_or_404(category_id)

        if current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
            raise ForbiddenException("Güncelleme yetkiniz yok")

        if current_user.role == UserRole.TEACHER:
            course = self.course_repo.get_by_id_or_404(cat.course_id)
            if str(course.teacher_id) != str(current_user.id):
                raise ForbiddenException("Sadece kendi dersinizin kategorisini güncelleyebilirsiniz")

        updates = {}
        if data.name is not None:
            if self.repo.name_exists(cat.course_id, data.name, exclude_id=category_id):
                raise ConflictException(f"Bu ders için '{data.name}' kategorisi zaten mevcut")
            updates["name"] = data.name
        if data.color is not None:
            updates["color"] = data.color

        updated = self.repo.update(category_id, updates)
        return CategoryResponse.model_validate(updated)

    def delete(self, category_id: UUID, current_user: User) -> dict:
        cat = self.repo.get_by_id_or_404(category_id)

        if current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
            raise ForbiddenException("Silme yetkiniz yok")

        if current_user.role == UserRole.TEACHER:
            course = self.course_repo.get_by_id_or_404(cat.course_id)
            if str(course.teacher_id) != str(current_user.id):
                raise ForbiddenException("Sadece kendi dersinizin kategorisini silebilirsiniz")

        if self.repo.has_active_projects(category_id):
            raise ConflictException(
                "Bu kategoride aktif projeler var. "
                "Projeleri başka bir kategoriye taşıyın veya arşivleyin, sonra silin."
            )

        self.repo.delete(category_id)
        return {"message": f"'{cat.name}' kategorisi silindi"}
