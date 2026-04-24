"""
UserDepartment (kullanıcı-bölüm) veritabanı modeli.

Kullanıcılar ile bölümler arasındaki çoka-çok ilişkiyi yönetir.
- Öğrenci: 1 bölüm
- Öğretmen: 1 veya daha fazla bölüm
"""

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel


class UserDepartment(BaseModel):
    """
    Kullanıcı-Bölüm ilişki tablosu (user_departments).

    Alanlar:
    - user_id: FK → users.id (CASCADE DELETE)
    - department_id: FK → departments.id (CASCADE DELETE)

    Unique constraint: Aynı user + department çifti sadece bir kez eklenebilir.
    BaseModel'den miras: id, created_at, updated_at, is_active
    """

    __tablename__ = "user_departments"

    __table_args__ = (
        UniqueConstraint("user_id", "department_id", name="uq_user_department"),
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Kullanıcı ID (FK → users)"
    )

    department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Bölüm ID (FK → departments)"
    )

    # İlişkiler
    user = relationship("User", back_populates="user_departments")
    department = relationship("Department", back_populates="user_departments")

    def __repr__(self):
        return f"<UserDepartment(user_id={self.user_id}, department_id={self.department_id})>"
