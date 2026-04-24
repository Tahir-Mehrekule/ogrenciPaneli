"""
ProjectMember (proje üyesi) veritabanı modeli.

Üyelik durumu:
  ACTIVE       — onaylanmış, aktif üye
  INVITED      — yönetici tarafından davet gönderildi, yanıt bekleniyor
  JOIN_REQUESTED — kullanıcı katılmak istedi, yönetici onayı bekleniyor
  REJECTED     — davet veya katılım isteği reddedildi

Üyelik rolü:
  MANAGER — proje yöneticisi (davet atar, isteği onaylar, üye çıkarır)
  MEMBER  — normal üye
"""

from sqlalchemy import Column, ForeignKey, Enum, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel
from app.common.enums import MemberRole, MemberStatus


class ProjectMember(BaseModel):
    """
    Proje üyelik tablosu (project_members).

    Unique constraint: (project_id, user_id) — aynı kişi aynı projeye 2 kez eklenemez.
    Arşivlenmiş projede davet/istek yapılamaz (servis katmanında kontrol edilir).
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
        Enum(MemberRole, name="member_role"),
        nullable=False,
        default=MemberRole.MEMBER,
        server_default="MEMBER",
        comment="Proje içi rol: MANAGER veya MEMBER"
    )

    status = Column(
        Enum(MemberStatus, name="member_status"),
        nullable=False,
        default=MemberStatus.ACTIVE,
        server_default="ACTIVE",
        comment="Üyelik durumu: ACTIVE | INVITED | JOIN_REQUESTED | REJECTED"
    )

    invited_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Daveti gönderen yönetici (JOIN_REQUESTED için null)"
    )

    responded_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Davet/isteğin kabul veya red zamanı"
    )

    joined_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Aktif üyelik başlangıç zamanı (ACTIVE olduğunda set edilir)"
    )

    # İlişkiler
    project = relationship("Project", foreign_keys=[project_id], lazy="select")
    user = relationship("User", foreign_keys=[user_id], lazy="select")
    inviter = relationship("User", foreign_keys=[invited_by], lazy="select")

    def __repr__(self):
        return (
            f"<ProjectMember(project={self.project_id}, user={self.user_id}, "
            f"role={self.role}, status={self.status})>"
        )
