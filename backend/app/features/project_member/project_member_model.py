"""
ProjectMember (proje üyesi) veritabanı modeli.

Bir proje ile kullanıcı arasındaki üyelik ilişkisini temsil eder.
Unique constraint: (project_id, user_id) — aynı kişi aynı projeye 2 kez eklenemez.
"""

from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel


class ProjectMember(BaseModel):
    """
    Proje üyelik tablosu (project_members).

    Alanlar:
    - project_id: Üyenin dahil olduğu proje
    - user_id: Üye olan kullanıcı
    - role: Proje içi rol ("leader" veya "member")

    Kısıtlamalar:
    - (project_id, user_id) çifti unique — mükerrer kayıt yok
    """

    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Proje ID'si"
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Üye kullanıcı ID'si"
    )

    role = Column(
        String(50),
        nullable=False,
        default="member",
        comment="Proje içi rol: leader veya member"
    )

    # İlişkiler
    project = relationship("Project", foreign_keys=[project_id], lazy="select")
    user = relationship("User", foreign_keys=[user_id], lazy="select")

    def __repr__(self):
        return f"<ProjectMember(project={self.project_id}, user={self.user_id}, role={self.role})>"
