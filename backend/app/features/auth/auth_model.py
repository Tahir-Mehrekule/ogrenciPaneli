
from sqlalchemy import Column, String, Enum

from app.common.base_model import BaseModel
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

    name = Column(
        String(150),
        nullable=False,
        comment="Ad soyad"
    )

    role = Column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.STUDENT,
        index=True,
        comment="Kullanıcı rolü: student, teacher, admin"
    )

    department = Column(
        String(200),
        nullable=True,
        comment="Bölüm adı"
    )

    def __repr__(self):
        """Debugging için okunabilir string temsili."""
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
