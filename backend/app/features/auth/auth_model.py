
from sqlalchemy import Column, String, Enum, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.base.base_model import BaseModel
from app.common.enums import UserRole


class User(BaseModel):

    __tablename__ = "users"

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="Okul mail adresi (unique)"
    )

    password_hash = Column(
        String(255),
        nullable=False,
        comment="Bcrypt ile hashlenmiş şifre"
    )

    first_name = Column(
        String(100),
        nullable=False,
        comment="Ad"
    )

    last_name = Column(
        String(100),
        nullable=False,
        comment="Soyad"
    )

    role = Column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.STUDENT,
        index=True,
        comment="Kullanıcı rolü: student, teacher, admin"
    )

    # İlişkiler
    user_departments = relationship(
        "UserDepartment",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )

    student_no = Column(
        String(9),
        unique=True,
        nullable=True,
        index=True,
        comment="9 haneli öğrenci numarası (sadece STUDENT rolü için, teacher/admin null)"
    )



    entry_year = Column(
        Integer,
        nullable=True,
        comment="Öğrencinin giriş yılı — prefix tablosundan kayıt anında otomatik set edilir"
    )

    grade_label = Column(
        String(50),
        nullable=True,
        comment="Sınıf etiketi (ör: '2. Sınıf') — prefix tablosundan kayıt anında otomatik set edilir"
    )

    class_section_id = Column(
        UUID(as_uuid=True),
        ForeignKey("class_sections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Atanmış şube — bölüm + sınıf + şube kombinasyonu (opsiyonel)",
    )

    class_section = relationship(
        "ClassSection",
        foreign_keys=[class_section_id],
        lazy="select",
    )

    @property
    def full_name(self) -> str:
        """Ad + soyad birleşimi."""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def departments(self) -> list:
        """Aktif bölüm listesi (Department nesneleri)."""
        return [
            ud.department
            for ud in self.user_departments
            if ud.is_active and ud.department and ud.department.is_active
        ]

    def __repr__(self):
        """Debugging için okunabilir string temsili."""
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
