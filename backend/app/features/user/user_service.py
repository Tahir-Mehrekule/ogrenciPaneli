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
    AdminCreateUserRequest,
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
        if data.email is not None:
            normalized_email = data.email.strip().lower()
            if normalized_email != target_user.email:
                from app.features.auth.auth_repo import AuthRepo
                if AuthRepo(self.db).email_exists(normalized_email):
                    raise ConflictException(f"'{normalized_email}' email adresi zaten kayıtlı.")
                update_data["email"] = normalized_email
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

    def deactivate_user(self, user_id: UUID, current_user: User) -> dict:
        """Admin: kullanıcıyı pasifleştirir (is_active=False). Veri korunur."""
        from app.common.exceptions import ForbiddenException
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Bu işlem sadece adminler tarafından yapılabilir")
        target_user = self.repo.get_by_id_or_404(user_id)
        self.manager.validate_self_delete(current_user, target_user)
        self.repo.update(user_id, {"is_active": False})
        return {"message": f"Kullanıcı pasifleştirildi: {target_user.full_name}"}

    def restore_user(self, user_id: UUID, current_user: User) -> dict:
        """Admin: pasifleştirilmiş kullanıcıyı geri aktif hale getirir."""
        from app.common.exceptions import ForbiddenException
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Bu işlem sadece adminler tarafından yapılabilir")
        target_user = self.repo.get_by_id(user_id, active_only=False)
        if target_user is None:
            from app.common.exceptions import NotFoundException
            raise NotFoundException(f"Kullanıcı bulunamadı: {user_id}")
        self.repo.update(user_id, {"is_active": True})
        return {"message": f"Kullanıcı geri aktif edildi: {target_user.full_name}"}

    def get_cascade_info(self, user_id: UUID, current_user: User) -> dict:
        """
        Soft delete öncesi etkilenecek bağlı kayıtların sayısını döner:
        - created_projects: bu kullanıcının oluşturduğu proje sayısı
        - memberships: aktif proje üyelik sayısı
        - reports: gönderdiği rapor sayısı
        """
        target_user = self.repo.get_by_id(user_id, active_only=False)
        if target_user is None:
            raise NotFoundException(f"Kullanıcı bulunamadı: {user_id}")

        from app.features.project.project_repo import ProjectRepo
        from app.features.project_member.project_member_repo import ProjectMemberRepo
        from app.features.report.report_repo import ReportRepo

        _, created_projects = ProjectRepo(self.db).get_many(filters={"created_by": user_id})
        _, memberships = ProjectMemberRepo(self.db).get_many(filters={"user_id": user_id})
        _, report_count = ReportRepo(self.db).get_many(filters={"submitted_by": user_id})
        return {
            "created_projects": created_projects,
            "memberships": memberships,
            "reports": report_count,
        }

    def create_user_as_admin(
        self, data: AdminCreateUserRequest, current_user: User,
    ) -> UserListResponse:
        """
        Admin manuel olarak yeni TEACHER veya STUDENT ekler (Paket Admin A3).

        Akış:
        1. Rol kontrol (ADMIN değil → ForbiddenException)
        2. Hedef rol kontrol (sadece STUDENT/TEACHER kabul)
        3. STUDENT için student_no zorunlu + duplicate kontrol
        4. Email duplicate kontrol
        5. En az 1 department_id zorunlu (her iki rol için)
        6. Department UUID'leri varlık kontrolü
        7. STUDENT için class_section_id varlık kontrolü (opsiyonel)
        8. (STUDENT) student_no'dan grade_label/entry_year parse (kullanıcı vermediyse)
        9. User insert + UserDepartment bağla
        10. (STUDENT) course_ids verildiyse CourseEnrollment insert
        11. log_activity(USER_REGISTER)
        """
        from app.core.security import hash_password
        from app.features.department.department_repo import DepartmentRepo
        from app.features.user_department.user_department_model import UserDepartment
        from app.common.validators import parse_student_number
        from app.common.activity_log_helper import log_activity
        from app.common.enums import ActivityAction, EntityType

        # 1
        if current_user.role != UserRole.ADMIN:
            raise ForbiddenException("Sadece ADMIN yeni kullanıcı ekleyebilir.")

        # 2
        if data.role not in (UserRole.STUDENT, UserRole.TEACHER):
            raise BadRequestException(
                "Bu endpoint sadece STUDENT veya TEACHER ekleme içindir."
            )

        # 5 — department zorunlu (her iki rol için)
        if not data.department_ids:
            raise BadRequestException(
                "En az bir bölüm seçilmelidir."
            )

        # 6 — department varlık kontrolü
        dept_repo = DepartmentRepo(self.db)
        departments = []
        for did in data.department_ids:
            dept = dept_repo.get_by_id(did)
            if not dept:
                raise BadRequestException(f"Bölüm bulunamadı: {did}")
            departments.append(dept)

        # AuthRepo, email/student_no duplicate kontrol metodlarını barındırır
        from app.features.auth.auth_repo import AuthRepo
        auth_repo = AuthRepo(self.db)

        # 4 — email duplicate
        email = data.email.strip().lower()
        if auth_repo.email_exists(email):
            raise ConflictException(f"'{email}' email adresi zaten kayıtlı.")

        # 3 + 8 — STUDENT özel kontroller
        entry_year = None
        grade_label = data.grade_label
        if data.role == UserRole.STUDENT:
            if not data.student_no:
                raise BadRequestException("STUDENT için öğrenci no zorunlu.")
            if auth_repo.student_no_exists(data.student_no):
                raise ConflictException(f"'{data.student_no}' öğrenci no zaten kayıtlı.")
            parsed = parse_student_number(data.student_no)
            if parsed:
                entry_year = parsed["entry_year"]
                if grade_label is None:
                    # parse'tan gelmiyor, prefix repo'dan dene
                    from app.features.student_prefix.student_prefix_repo import StudentPrefixRepo
                    match = StudentPrefixRepo(self.db).match_student_no(data.student_no)
                    if match:
                        grade_label = match.label
                        entry_year = match.entry_year

        # 7 — class_section_id varlık kontrolü
        if data.class_section_id is not None:
            from app.features.class_section.class_section_repo import ClassSectionRepo
            cs = ClassSectionRepo(self.db).get_by_id(data.class_section_id)
            if not cs:
                raise BadRequestException(f"Şube bulunamadı: {data.class_section_id}")

        # 9 — User + UserDepartment
        user_dict = {
            "email": email,
            "password_hash": hash_password(data.password),
            "first_name": data.first_name.strip(),
            "last_name": data.last_name.strip(),
            "role": data.role,
        }
        if data.role == UserRole.STUDENT:
            user_dict.update({
                "student_no": data.student_no,
                "grade_label": grade_label,
                "entry_year": entry_year,
                "class_section_id": data.class_section_id,
            })
        new_user = self.repo.create(user_dict)

        for dept in departments:
            self.db.add(UserDepartment(user_id=new_user.id, department_id=dept.id))

        # 10 — TEACHER için seçilen derslerin teacher_id'sini bu kullanıcıya devret.
        # (ADMIN_PLAN_2 / Paket C2: single-FK transfer pattern.)
        # STUDENT için CourseEnrollment insert YAPILMIYOR; öğrenciye bölüm
        # bazlı otomatik ders erişimi `course_service.list_courses` ile sağlanır.
        if data.role == UserRole.TEACHER and data.course_ids:
            from app.features.course.course_model import Course
            existing = (
                self.db.query(Course)
                .filter(Course.id.in_(data.course_ids))
                .all()
            )
            if len(existing) != len(set(data.course_ids)):
                raise NotFoundException("Atanmaya çalışılan derslerden bazıları bulunamadı.")
            for c in existing:
                c.teacher_id = new_user.id
                log_activity(
                    self.db, ActivityAction.COURSE_UPDATE,
                    user_id=current_user.id,
                    entity_type=EntityType.COURSE,
                    entity_id=c.id,
                    details={
                        "teacher_changed_to": str(new_user.id),
                        "via": "admin_create_user",
                    },
                )
            self.db.flush()

        self.db.commit()
        self.db.refresh(new_user)

        # 11 — log
        log_activity(
            self.db, ActivityAction.USER_REGISTER,
            user_id=current_user.id,
            entity_type=EntityType.USER,
            entity_id=new_user.id,
            details={"email": new_user.email, "role": new_user.role.value, "via": "admin_create"},
        )

        return UserListResponse.model_validate(new_user)

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
