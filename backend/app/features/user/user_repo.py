"""
User repository (veri erişim) modülü.

User tablosu için DB sorgularını tanımlar.
BaseRepository[User]'dan türer — CRUD ve get_many otomatik gelir.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import or_, desc, asc
from sqlalchemy.orm import Session

from app.common.base_repo import BaseRepository
from app.common.enums import ApprovalStatus, UserRole
from app.features.auth.auth_model import User


class UserRepo(BaseRepository[User]):
    """
    User tablosu için repository.

    BaseRepository'den miras alınan işlemler:
    - create, get_by_id, get_by_id_or_404, get_all, get_many, count, update, delete, hard_delete
    """

    def __init__(self, db: Session):
        super().__init__(User, db)

    def search_students(
        self,
        q: str,
        entry_year: Optional[int] = None,
        limit: int = 20,
    ) -> list[User]:
        """
        Ad, soyad, mail veya okul numarasına göre STUDENT arama.
        entry_year verilirse sadece aynı sınıf döner (sınıf kısıtı).
        """
        query = (
            self.db.query(User)
            .filter(User.role == UserRole.STUDENT)
            .filter(User.approval_status == ApprovalStatus.APPROVED)
            .filter(User.is_active == True)
            .filter(
                or_(
                    User.first_name.ilike(f"%{q}%"),
                    User.last_name.ilike(f"%{q}%"),
                    User.email.ilike(f"%{q}%"),
                    User.student_no.ilike(f"%{q}%"),
                )
            )
        )
        if entry_year is not None:
            query = query.filter(User.entry_year == entry_year)

        return query.limit(limit).all()

    def student_no_exists_excluding(self, student_no: str, exclude_user_id: UUID) -> bool:
        """
        Verilen öğrenci numarası başka bir kullanıcıda kayıtlı mı kontrol eder.
        Güncelleme senaryosu için: mevcut kullanıcıyı hariç tutar.
        """
        user = (
            self.db.query(User)
            .filter(User.student_no == student_no)
            .filter(User.id != exclude_user_id)
            .first()
        )
        return user is not None

    def get_students_by_department_ids(
        self,
        department_ids: list[UUID],
        search: Optional[str] = None,
        grade_label: Optional[str] = None,
        student_no: Optional[str] = None,
        page: int = 1,
        size: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> tuple[list[User], int]:
        """
        Belirli bölümlerdeki öğrencileri listeler.
        Öğretmenin 'öğrencilerim' listesi için kullanılır.
        """
        from app.features.user_department.user_department_model import UserDepartment

        query = (
            self.db.query(User)
            .join(UserDepartment, UserDepartment.user_id == User.id)
            .filter(UserDepartment.department_id.in_(department_ids))
            .filter(UserDepartment.is_active == True)
            .filter(User.role == UserRole.STUDENT)
            .filter(User.is_active == True)
            .distinct()
        )

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(term),
                    User.last_name.ilike(term),
                    User.email.ilike(term),
                    User.student_no.ilike(term),
                )
            )

        if grade_label:
            query = query.filter(User.grade_label == grade_label)

        if student_no:
            query = query.filter(User.student_no.ilike(f"%{student_no}%"))

        total = query.count()

        sort_col = getattr(User, sort_by, User.created_at)
        query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

        skip = (page - 1) * size
        items = query.offset(skip).limit(size).all()

        return items, total
