"""
Department (bölüm) veritabanı modeli.

Admin panelinden dinamik olarak yönetilen bölüm listesini temsil eder.
Kullanıcı-bölüm ilişkisi user_departments tablosu üzerinden çoka-çok olarak tutulur.
"""

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel


class Department(BaseModel):
    """
    Bölüm tablosu (departments).

    Alanlar:
    - name: Bölüm adı — unique (örn: "Bilgisayar Mühendisliği")

    BaseModel'den miras: id, created_at, updated_at, is_active
    """

    __tablename__ = "departments"

    name = Column(
        String(200),
        nullable=False,
        unique=True,
        index=True,
        comment="Bölüm adı — unique (örn: Bilgisayar Mühendisliği)"
    )

    user_departments = relationship(
        "UserDepartment",
        back_populates="department",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Department(id={self.id}, name={self.name})>"
