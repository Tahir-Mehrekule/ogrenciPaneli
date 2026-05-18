"""
Department (bölüm) veritabanı modeli.

Admin panelinden dinamik olarak yönetilen bölüm listesini temsil eder.
Kullanıcı-bölüm ilişkisi user_departments tablosu üzerinden çoka-çok olarak tutulur.
"""

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.base.base_model import BaseModel


class Department(BaseModel):
    """
    Bölüm tablosu (departments).

    Alanlar:
    - name: Bölüm adı — unique (örn: "Bilgisayar Mühendisliği")
    - code: 3 haneli bölüm kodu — unique (örn: "235"). Öğrenci no parser bu koda göre çalışır.

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

    code = Column(
        String(3),
        nullable=False,
        unique=True,
        index=True,
        comment="3 haneli bölüm kodu — unique (örn: 235). Öğrenci no parser kullanır."
    )

    user_departments = relationship(
        "UserDepartment",
        back_populates="department",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Department(id={self.id}, code={self.code}, name={self.name})>"
