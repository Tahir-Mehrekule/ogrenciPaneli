"""
Şifre sıfırlama token modeli.

Token kullanıcıya email ile gönderilir (TODO: email servisi entegre edilmeli).
Development modunda token konsola yazılır.

Güvenlik özellikleri:
- Token kriptografik olarak rastgele üretilir (secrets.token_urlsafe)
- 1 saat geçerlidir (RESET_TOKEN_EXPIRE_MINUTES)
- Tek kullanımlıktır — kullanım sonrası silinir
- Email başına tek aktif token (yeni istek eskiyi siler)
"""

from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.database import Base


class PasswordResetToken(Base):
    """
    Şifre sıfırlama tokenleri tablosu.

    Her kayıt: kullanıcı email → kısa süreli token eşlemesi.
    Token kullanıldığında veya süresi dolduğunda silinir.
    """
    __tablename__ = "password_reset_tokens"

    token = Column(
        String(128),
        primary_key=True,
        nullable=False,
        comment="Kriptografik sıfırlama token'ı (URL-safe base64)",
    )
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Token sahibi kullanıcı",
    )
    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Token son kullanma zamanı (1 saat)",
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at
