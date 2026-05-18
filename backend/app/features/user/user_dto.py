"""
User DTO (Data Transfer Object) modülü.

Kullanıcı yönetimi için request/response şemalarını tanımlar.
Admin panelinde kullanıcıları listeleme, güncelleme ve filtreleme işlemleri için kullanılır.
"""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator

from app.common.enums import UserRole
from app.base.base_dto import FilterParams, BaseResponse
from app.features.auth.auth_dto import DepartmentInfo


class BulkImportResult(BaseModel):
    """Excel/CSV öğrenci import sonuç özeti."""
    total_processed: int = 0
    successful: int = 0
    failed: int = 0
    errors: list[str] = []





class ImportStudentData(BaseModel):
    """Frontend'den JSON olarak gelen tekil öğrenci import verisi."""
    first_name: str = Field(min_length=2, max_length=100)
    last_name: str = Field(min_length=2, max_length=100)
    email: str
    student_no: str = Field(min_length=9, max_length=9, pattern=r"^\d{9}$")
    department_names: list[str] = Field(default=[], description="Bölüm adları (isimden eşleştirilecek)")


class UserListResponse(BaseResponse):
    """
    Kullanıcı liste/detay response'u.

    BaseResponse'tan miras alınan alanlar: id, created_at, updated_at.
    Şifre (password_hash) ASLA response'ta gönderilmez.
    """
    email: str
    first_name: str
    last_name: str
    full_name: str
    role: UserRole
    departments: list[DepartmentInfo] = []
    student_no: Optional[str] = None
    grade_label: Optional[str] = None
    entry_year: Optional[int] = None

    is_active: bool


class UserUpdateRequest(BaseModel):
    """
    Kullanıcı güncelleme isteği (PATCH — kısmi güncelleme).

    Tüm alanlar opsiyonel — sadece gönderilen alanlar güncellenir.
    department_ids gönderilirse mevcut bölümler silinip yenileri eklenir.
    """
    first_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
        description="Ad"
    )
    email: Optional[str] = Field(
        default=None,
        min_length=5,
        max_length=255,
        description="Email adresi (benzersiz)"
    )
    last_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
        description="Soyad"
    )
    role: Optional[UserRole] = Field(
        default=None,
        description="Kullanıcı rolü (sadece ADMIN değiştirebilir)"
    )
    department_ids: Optional[list[str]] = Field(
        default=None,
        description="Yeni bölüm ID listesi — gönderilirse mevcut bölümler tamamen değiştirilir"
    )


class UpdateStudentInfoRequest(BaseModel):
    """
    Öğrenci numarası ve sınıf bilgisi güncelleme.

    TEACHER veya ADMIN tarafından yapılabilir.
    - Yeni student_no başka bir kullanıcıda kayıtlıysa 409 döner.
    - student_no verilirse prefix tablosundan grade_label + entry_year otomatik güncellenir.
    - grade_label / entry_year açıkça verilirse prefix'ten gelen değeri override eder.
    """
    student_no: Optional[str] = Field(
        default=None,
        min_length=9,
        max_length=9,
        pattern=r"^\d{9}$",
        description="Yeni öğrenci numarası (9 haneli rakam)"
    )
    grade_label: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Sınıf etiketi (ör: '2. Sınıf') — prefix'ten otomatik gelir, override için gönder"
    )
    entry_year: Optional[int] = Field(
        default=None,
        ge=2000,
        le=2100,
        description="Giriş yılı — prefix'ten otomatik gelir, override için gönder"
    )


class UserFilterParams(FilterParams):
    """
    Kullanıcı listesi filtreleme parametreleri.

    FilterParams'tan miras alınan alanlar: page, size, sort_by, order, search.

    Ek filtreler:
    - role: Belirli bir role göre filtrele
    - department_id: Belirli bir bölüme göre filtrele (UUID)
    - is_active: Aktif/pasif kullanıcıları filtrele
    - grade_label: Sınıf etiketi filtresi
    - student_no: Öğrenci numarası filtresi
    """
    role: Optional[str] = Field(
        default=None,
        description="Rol filtresi (student, teacher, admin)"
    )

    @field_validator("role", mode="before")
    @classmethod
    def _normalize_role_filter(cls, v):
        if isinstance(v, str):
            v = v.strip().lower()
            valid = {r.value for r in UserRole}
            if v and v not in valid:
                raise ValueError(f"Geçersiz rol: {v}. Geçerli: {', '.join(valid)}")
            return v
        return v

    department_id: Optional[UUID] = Field(
        default=None,
        description="Bölüm ID filtresi"
    )
    is_active: Optional[bool] = Field(
        default=None,
        description="Aktif/pasif filtresi. Boş bırakılırsa tüm durumlar döner."
    )
    grade_label: Optional[str] = Field(
        default=None,
        description="Sınıf etiketi filtresi (ör: '2. Sınıf')"
    )
    student_no: Optional[str] = Field(
        default=None,
        description="Öğrenci numarası filtresi (kısmi eşleşme)"
    )


class ExportFilterParams(UserFilterParams):
    """Export için parametreler. Sayfalama devre dışı bırakılabilir."""
    page: int = Field(default=1, description="Sayfa numarası (Tümünü indirmek için 1)")
    size: int = Field(default=10000, description="Kayıt sayısı (Tümünü indirmek için yüksek bir sayı)")


# ─────────────── Admin → Kullanıcı Oluştur (Paket 5 / Admin Plan A3) ───────────────

class AdminCreateUserRequest(BaseModel):
    """
    Admin yeni öğretmen veya öğrenci ekler.

    Şifre admin formda girer (Karar A). Email + student_no unique kontrol edilir.
    STUDENT için student_no + en az 1 department zorunlu.
    TEACHER için en az 1 department zorunlu.
    """
    role: UserRole = Field(
        description="Rol — sadece STUDENT veya TEACHER kabul edilir (ADMIN ayrı flow)",
    )

    @field_validator("role", mode="before")
    @classmethod
    def _normalize_role(cls, v):
        # Frontend uppercase ("TEACHER") veya lowercase ("teacher") gönderebilir;
        # backend enum lowercase olduğu için case-insensitive normalize edilir.
        if isinstance(v, str):
            return v.lower()
        return v

    email: str = Field(min_length=5, max_length=255, description="Email (okul maili formatında)")
    password: str = Field(
        min_length=8, max_length=72,
        description="Geçici şifre (admin belirler, kullanıcı sonradan değiştirebilir)",
    )
    first_name: str = Field(min_length=2, max_length=100)
    last_name: str = Field(min_length=2, max_length=100)
    department_ids: list[UUID] = Field(
        default_factory=list,
        description="Bölüm ID'leri. TEACHER ve STUDENT için en az 1 zorunlu.",
    )
    # Sadece STUDENT için
    student_no: Optional[str] = Field(
        default=None,
        min_length=9, max_length=9, pattern=r"^\d{9}$",
        description="9 haneli öğrenci numarası (STUDENT için zorunlu)",
    )
    grade_label: Optional[str] = Field(
        default=None, max_length=50,
        description="Sınıf etiketi (örn: '2. Sınıf'). Verilmezse student_no'dan parse edilir.",
    )
    class_section_id: Optional[UUID] = Field(
        default=None,
        description="Şube ID (opsiyonel, STUDENT için)",
    )
    course_ids: list[UUID] = Field(
        default_factory=list,
        description=(
            "TEACHER için: bu öğretmene atanacak ders ID'leri "
            "(course.teacher_id bu kullanıcıya set edilir). "
            "STUDENT için: kullanılmaz — bölüm bazlı otomatik erişim hakimdir."
        ),
    )

    @model_validator(mode="after")
    def _validate_role_specific_fields(self):
        """
        ADMIN_PLAN_2 / Paket C2:
        - STUDENT tek bölüme atanmalı (multi yerine).
        - TEACHER >=1 bölüme atanabilir.
        - STUDENT için course_ids ignore edilir (bölüm bazlı erişim).
        """
        if self.role == UserRole.STUDENT:
            if len(self.department_ids) != 1:
                raise ValueError("Öğrenci tam olarak bir bölüme atanmalıdır.")
            # STUDENT için course_ids backend'de işlenmez; defensive temizlik:
            self.course_ids = []
        elif self.role == UserRole.TEACHER:
            if len(self.department_ids) < 1:
                raise ValueError("Öğretmen en az bir bölüme atanmalıdır.")
        return self
