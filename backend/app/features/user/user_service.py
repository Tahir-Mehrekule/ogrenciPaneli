"""
User service (iş mantığı) modülü.

Kullanıcı yönetimi işlemlerinin orkestrasyon katmanı.
Manager'ı çağırarak validasyon yapar, repo'ya yönlendirerek DB işlemi yapar.
"""

import math
from uuid import UUID

from sqlalchemy.orm import Session

from app.base.base_dto import PaginatedResponse
from app.base.base_service import BaseService
from app.common.enums import UserRole
from app.common.exceptions import NotFoundException, BadRequestException, ForbiddenException, ConflictException
from app.features.auth.auth_model import User
from app.features.user.user_repo import UserRepo
from app.features.user.user_manager import UserManager
from app.features.user.user_dto import (
    UserListResponse,
    UserUpdateRequest,
    UpdateStudentInfoRequest,
    UserFilterParams,
    ImportStudentData,
    BulkImportResult,
)


class UserService(BaseService[User, UserRepo]):
    """
    Kullanıcı yönetimi iş mantığı servisi.

    Sorumluluklar:
    - Kullanıcı listeleme (filtreli, sayfalanmış)
    - Kullanıcı detay görüntüleme
    - Kullanıcı güncelleme (rol, isim, bölüm)
    - Kullanıcı silme (soft delete)
    - Öğrenci no + sınıf bilgisi güncelleme (öğretmen/admin)
    - Öğretmenin kendi bölümündeki öğrencileri listeleme
    """

    def __init__(self, db: Session):
        super().__init__(UserRepo, db)
        self.manager = UserManager(db)

    def list_users(self, params: UserFilterParams) -> PaginatedResponse:
        """
        Filtreli ve sayfalanmış kullanıcı listesi döner.
        Bölüm filtresi için UserDepartment JOIN yapılır.
        """
        # Bölüm filtresi varsa özel sorgu
        if params.department_id is not None:
            users, total = self.repo.get_students_by_department_ids(
                department_ids=[params.department_id],
                search=params.search,
                grade_label=params.grade_label,
                student_no=params.student_no,
                page=params.page,
                size=params.size,
                sort_by=params.sort_by,
                order=params.order,
            )
            items = [UserListResponse.model_validate(u) for u in users]
            return PaginatedResponse(
                items=items,
                total=total,
                page=params.page,
                size=params.size,
                pages=math.ceil(total / params.size) if params.size > 0 else 0,
            )

        # Standart filtreler
        filters = {}
        if params.role is not None:
            filters["role"] = params.role
        if params.is_active is not None:
            filters["is_active"] = params.is_active
        if params.grade_label is not None:
            filters["grade_label"] = params.grade_label

        like_filters = {}
        if params.student_no is not None:
            like_filters["student_no"] = params.student_no

        users, total = self.repo.get_many(
            filters=filters,
            like_filters=like_filters if like_filters else None,
            search=params.search,
            search_fields=["first_name", "last_name", "email"],
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
            active_only=False,
        )
        items = [UserListResponse.model_validate(u) for u in users]

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def list_my_students(self, teacher: User, params: UserFilterParams) -> PaginatedResponse:
        """
        Öğretmenin bölümlerindeki öğrencileri listeler.
        Öğretmenin user_departments'ından bölüm ID'leri alınır.
        """
        dept_ids = [ud.department_id for ud in teacher.user_departments if ud.is_active and not ud.is_deleted]
        if not dept_ids:
            return PaginatedResponse(items=[], total=0, page=params.page, size=params.size, pages=0)

        users, total = self.repo.get_students_by_department_ids(
            department_ids=dept_ids,
            search=params.search,
            grade_label=params.grade_label,
            student_no=params.student_no,
            page=params.page,
            size=params.size,
            sort_by=params.sort_by,
            order=params.order,
        )
        items = [UserListResponse.model_validate(u) for u in users]

        return PaginatedResponse(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=math.ceil(total / params.size) if params.size > 0 else 0,
        )

    def get_user(self, user_id: UUID) -> UserListResponse:
        """ID ile tek kullanıcı detayını döner."""
        user = self.repo.get_by_id_or_404(user_id)
        return UserListResponse.model_validate(user)

    def update_user(
        self,
        user_id: UUID,
        data: UserUpdateRequest,
        current_user: User,
    ) -> UserListResponse:
        """
        Kullanıcı bilgilerini günceller (kısmi güncelleme — PATCH).
        department_ids gönderilirse mevcut bölümler silinip yenileri eklenir.
        """
        target_user = self.repo.get_by_id_or_404(user_id)

        # Rol değişikliği validasyonu
        if data.role is not None and data.role != target_user.role:
            admins, _ = self.repo.get_many(filters={"role": "admin"}, active_only=True)
            self.manager.validate_role_change(current_user, target_user, data.role, len(admins))

        # department_ids ayrı işlenir
        update_data = {}
        if data.first_name is not None:
            update_data["first_name"] = data.first_name.strip()
        if data.last_name is not None:
            update_data["last_name"] = data.last_name.strip()
        if data.role is not None:
            update_data["role"] = data.role

        if update_data:
            self.repo.update(user_id, update_data)

        # Bölüm güncellemesi
        if data.department_ids is not None:
            self._update_user_departments(target_user, data.department_ids)

        self.db.refresh(target_user)
        return UserListResponse.model_validate(target_user)

    def update_student_info(
        self,
        student_id: UUID,
        data: UpdateStudentInfoRequest,
        current_user: User,
    ) -> UserListResponse:
        """
        Öğrencinin numarasını ve sınıf bilgisini günceller.
        Sadece TEACHER veya ADMIN yapabilir.

        - Yeni student_no başka kullanıcıda varsa ConflictException
        - student_no verilirse prefix tablosundan grade_label + entry_year güncellenir
        - grade_label / entry_year açıkça verilirse prefix sonucunu override eder
        """
        target_user = self.repo.get_by_id_or_404(student_id)

        if target_user.role != UserRole.STUDENT:
            raise BadRequestException("Bu işlem sadece öğrenci hesapları için geçerlidir")

        # Öğretmen sadece kendi bölümündeki öğrencileri güncelleyebilir
        if current_user.role == UserRole.TEACHER:
            teacher_dept_ids = {str(ud.department_id) for ud in current_user.user_departments if ud.is_active and not ud.is_deleted}
            student_dept_ids = {str(ud.department_id) for ud in target_user.user_departments if ud.is_active and not ud.is_deleted}
            if not teacher_dept_ids.intersection(student_dept_ids):
                raise ForbiddenException("Sadece kendi bölümünüzdeki öğrencilerin bilgilerini güncelleyebilirsiniz")

        update_data = {}

        if data.student_no is not None:
            # Çakışma kontrolü — başka kullanıcıda bu numara var mı?
            if self.repo.student_no_exists_excluding(data.student_no, student_id):
                raise ConflictException(
                    f"'{data.student_no}' numarası başka bir öğrenciye kayıtlı. "
                    "Önce ilgili kaydı kontrol edin."
                )
            update_data["student_no"] = data.student_no

            # Prefix tablosundan otomatik sınıf bilgisi çek
            from app.features.student_prefix.student_prefix_repo import StudentPrefixRepo
            match = StudentPrefixRepo(self.db).match_student_no(data.student_no)
            if match:
                update_data["entry_year"] = match.entry_year
                update_data["grade_label"] = match.label

        # Açıkça verilen override'lar prefix sonucunu ezer
        if data.grade_label is not None:
            update_data["grade_label"] = data.grade_label
        if data.entry_year is not None:
            update_data["entry_year"] = data.entry_year

        if update_data:
            self.repo.update(student_id, update_data)

        self.db.refresh(target_user)
        return UserListResponse.model_validate(target_user)

    def delete_user(self, user_id: UUID, current_user: User) -> dict:
        """
        Rol bazlı silme:
        - ADMIN → hard delete (kayıt DB'den tamamen kaldırılır)
        - TEACHER → soft delete (is_active=False, kayıt erişilebilir kalır)
        """
        target_user = self.repo.get_by_id_or_404(user_id)
        self.manager.validate_self_delete(current_user, target_user)

        if current_user.role == UserRole.ADMIN:
            self.repo.delete(user_id)
            return {"message": f"Kullanıcı kalıcı olarak silindi: {target_user.full_name}"}
        else:
            # TEACHER → soft delete
            self.repo.update(user_id, {"is_active": False})
            return {"message": f"Kullanıcı pasifleştirildi: {target_user.full_name}"}

    def import_students(self, data: list[ImportStudentData]) -> BulkImportResult:
        """JSON formatında gelen öğrencileri toplu olarak ekler."""
        from app.core.security import hash_password
        from app.features.department.department_repo import DepartmentRepo
        from app.features.department.department_model import Department
        from app.features.student_prefix.student_prefix_repo import StudentPrefixRepo
        from app.features.user_department.user_department_model import UserDepartment

        result = BulkImportResult(total_processed=len(data))
        dept_repo = DepartmentRepo(self.db)
        prefix_repo = StudentPrefixRepo(self.db)

        # Cache existing departments to avoid repetitive DB calls
        all_depts = dept_repo.get_all()
        dept_map = {d.name.lower().strip(): d for d in all_depts}
        
        # Default password for imported users
        default_pw_hash = hash_password("Ogrenci123!")

        for student_data in data:
            try:
                email = student_data.email.lower().strip()
                student_no = student_data.student_no.strip()

                # Check duplicates
                if self.repo.email_exists(email):
                    result.failed += 1
                    result.errors.append(f"{email}: Bu email adresi zaten kayıtlı.")
                    continue
                if self.repo.student_no_exists(student_no):
                    result.failed += 1
                    result.errors.append(f"{student_no}: Bu öğrenci numarası zaten kayıtlı.")
                    continue

                # Get prefix info
                entry_year = None
                grade_label = None
                match = prefix_repo.match_student_no(student_no)
                if match:
                    entry_year = match.entry_year
                    grade_label = match.label

                # Create User
                user_dict = {
                    "email": email,
                    "password_hash": default_pw_hash,
                    "first_name": student_data.first_name.strip(),
                    "last_name": student_data.last_name.strip(),
                    "role": UserRole.STUDENT,
                    "student_no": student_no,
                    "entry_year": entry_year,
                    "grade_label": grade_label,
                }
                user = self.repo.create(user_dict)

                # Process Departments
                for d_name in student_data.department_names:
                    d_name_clean = d_name.strip()
                    d_key = d_name_clean.lower()
                    
                    if d_key not in dept_map:
                        # Create new department if it doesn't exist
                        new_dept = dept_repo.create({"name": d_name_clean})
                        dept_map[d_key] = new_dept
                    
                    dept = dept_map[d_key]
                    ud = UserDepartment(user_id=user.id, department_id=dept.id)
                    self.db.add(ud)

                self.db.commit()
                result.successful += 1

            except Exception as e:
                self.db.rollback()
                result.failed += 1
                result.errors.append(f"{student_data.email}: Beklenmeyen hata ({str(e)})")

        return result

    # ── İç yardımcı ──────────────────────────────────────────────────────────

    def _update_user_departments(self, user: User, department_ids: list[str]) -> None:
        """Kullanıcının bölümlerini siler ve yeniden ekler."""
        from app.features.user_department.user_department_model import UserDepartment
        from app.features.department.department_repo import DepartmentRepo

        # Mevcut bölümleri sil
        self.db.query(UserDepartment).filter(UserDepartment.user_id == user.id).delete()

        # Yenilerini ekle
        dept_repo = DepartmentRepo(self.db)
        for dept_id_str in department_ids:
            try:
                dept = dept_repo.get_by_id(UUID(dept_id_str))
                if dept:
                    ud = UserDepartment(user_id=user.id, department_id=dept.id)
                    self.db.add(ud)
            except (ValueError, Exception):
                pass

        self.db.commit()
