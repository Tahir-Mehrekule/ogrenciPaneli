"""add password_reset_tokens table

Revision ID: b2c4d6e8f0a1
Revises: a7f3e1d9c8b2
Create Date: 2026-05-13

Değişiklikler:
1. password_reset_tokens tablosu oluşturulur (G-10: şifre sıfırlama akışı)
   - token: kriptografik sıfırlama anahtarı (PK, 128 karakter URL-safe base64)
   - user_id: FK → users (CASCADE on delete)
   - expires_at: token son kullanma süresi (1 saat)
   - ix_prt_expires_at: süresi dolmuş token temizleme indeksi
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


# revision identifiers
revision = 'b2c4d6e8f0a1'
down_revision = 'a7f3e1d9c8b2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'password_reset_tokens',
        sa.Column(
            'token', sa.String(128), primary_key=True, nullable=False,
            comment='Kriptografik sıfırlama token\'ı (URL-safe base64)',
        ),
        sa.Column(
            'user_id', PG_UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
            comment='Token sahibi kullanıcı',
        ),
        sa.Column(
            'expires_at', sa.DateTime(timezone=True),
            nullable=False,
            comment='Token son kullanma zamanı (1 saat)',
        ),
        sa.Column(
            'created_at', sa.DateTime(timezone=True),
            server_default=sa.text('NOW()'),
            nullable=False,
        ),
    )
    op.create_index(
        'ix_prt_user_id', 'password_reset_tokens', ['user_id']
    )
    op.create_index(
        'ix_prt_expires_at', 'password_reset_tokens', ['expires_at']
    )


def downgrade() -> None:
    op.drop_index('ix_prt_expires_at', table_name='password_reset_tokens')
    op.drop_index('ix_prt_user_id', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
