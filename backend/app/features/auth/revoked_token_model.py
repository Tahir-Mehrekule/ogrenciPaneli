"""
Revoked Token modeli.

Kullanılmış veya logout edilmiş refresh token'ların jti (JWT ID) değerlerini saklar.
Yeni bir refresh isteğinde token'ın jti'si bu tabloda aranır; bulunursa reddedilir.

Not: Süresi dolmuş kayıtlar periyodik olarak temizlenebilir (cleanup_expired).
"""

from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.database import Base


class RevokedToken(Base):
    """
    Revoke edilmiş JWT token kayıtları.

    Alanlar:
    - jti: Token'ın benzersiz kimliği (JWT ID claim)
    - token_type: "refresh" (şimdilik sadece refresh token'lar revoke ediliyor)
    - expires_at: Token'ın orijinal son kullanma tarihi (cleanup için)
    - revoked_at: Revoke edilme zamanı
    """

    __tablename__ = "revoked_tokens"

    jti = Column(
        String(64),
        primary_key=True,
        nullable=False,
        comment="JWT ID — token'ın benzersiz kimliği",
    )
    token_type = Column(
        String(10),
        nullable=False,
        default="refresh",
        comment="Token tipi (refresh)",
    )
    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Token'ın orijinal son kullanma tarihi",
    )
    revoked_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Revoke edilme zamanı",
    )

    __table_args__ = (
        Index("ix_revoked_tokens_expires_at", "expires_at"),
    )

    @classmethod
    def cleanup_expired(cls, db) -> int:
        """
        Süresi dolmuş revoked token kayıtlarını temizler.
        Periyodik görev veya manuel çağrı ile kullanılabilir.

        Returns:
            int: Silinen kayıt sayısı
        """
        now = datetime.now(timezone.utc)
        deleted = db.query(cls).filter(cls.expires_at < now).delete()
        db.commit()
        return deleted
