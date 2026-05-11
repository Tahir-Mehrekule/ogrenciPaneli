"""
Dosya yükleme (File Upload) veritabanı modeli.

Sisteme yüklenen dosyaların (PDF, Word vb.) metadata'sını tutar.
Fiziksel / orijinal dosyalar MinIO'da saklanır.
"""

from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.base.base_model import BaseModel


class FileUpload(BaseModel):
    """
    Raporlara yüklenen dosya kayıtları tablosu.

    - report_id: Hangi rapora ait olduğu
    - uploaded_by: Kimin yüklediği
    - original_name: Dosyanın kullanıcıdaki adı
    - storage_key: MinIO'daki benzersiz nesne anahtarı (bucket içindeki yolu)
    - file_size: Boyutu (byte)
    - mime_type: Dosya türü (application/pdf, image/png vb.)
    """

    __tablename__ = "files"

    report_id = Column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="İlişkili rapor"
    )

    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Dosyayı yükleyen kullanıcı"
    )

    original_name = Column(
        String(255),
        nullable=False,
        comment="Örn: sunum.pdf"
    )

    storage_key = Column(
        String(500),
        nullable=False,
        unique=True,
        index=True,
        comment="MinIO bucket içindeki eşsiz path"
    )

    file_size = Column(
        Integer,
        nullable=False,
        comment="Dosya boyutu (byte)"
    )

    mime_type = Column(
        String(100),
        nullable=False,
        comment="MIME tipi (örn. application/pdf)"
    )

    # İlişkiler
    report = relationship("Report", foreign_keys=[report_id], lazy="select")
    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="select")

    def __repr__(self):
        return f"<FileUpload(id={self.id}, name={self.original_name}, report_id={self.report_id})>"
