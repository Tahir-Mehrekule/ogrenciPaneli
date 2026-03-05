"""
Report (haftalık rapor) veritabanı modeli.

Öğrencilerin proje ilerlemelerini haftalık olarak raporladığı tablo.
Unique constraint: (project_id, submitted_by, week_number, year) — haftada bir rapor.
"""

from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.common.base_model import BaseModel
from app.common.enums import ReportStatus


class Report(BaseModel):
    """
    Haftalık rapor tablosu (reports).

    Alanlar:
    - project_id: Ait olduğu proje
    - submitted_by: Raporlayan öğrenci
    - week_number: Yılın kaçıncı haftası (ISO hafta: 1–53)
    - year: Rapor yılı
    - content: Rapor içeriği
    - youtube_url: Video rapor linki (opsiyonel)
    - status: DRAFT → SUBMITTED → REVIEWED
    - reviewer_note: Öğretmenin geri bildirimi (opsiyonel)

    Kısıtlamalar:
    - (project_id, submitted_by, week_number, year) unique — haftada 1 rapor
    """

    __tablename__ = "reports"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "submitted_by", "week_number", "year",
            name="uq_report_weekly"
        ),
    )

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Ait olduğu proje"
    )

    submitted_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Raporlayan öğrenci"
    )

    week_number = Column(
        Integer,
        nullable=False,
        comment="ISO hafta numarası (1–53)"
    )

    year = Column(
        Integer,
        nullable=False,
        comment="Rapor yılı"
    )

    content = Column(
        Text,
        nullable=False,
        comment="Rapor içeriği"
    )

    youtube_url = Column(
        String(500),
        nullable=True,
        comment="Video rapor YouTube linki"
    )

    status = Column(
        Enum(ReportStatus, name="report_status"),
        nullable=False,
        default=ReportStatus.DRAFT,
        index=True,
        comment="Rapor durumu: DRAFT → SUBMITTED → REVIEWED"
    )

    reviewer_note = Column(
        Text,
        nullable=True,
        comment="Öğretmenin geri bildirimi"
    )

    # İlişkiler
    project = relationship("Project", foreign_keys=[project_id], lazy="select")
    author = relationship("User", foreign_keys=[submitted_by], lazy="select")

    def __repr__(self):
        return f"<Report(project={self.project_id}, week={self.week_number}/{self.year}, status={self.status})>"
