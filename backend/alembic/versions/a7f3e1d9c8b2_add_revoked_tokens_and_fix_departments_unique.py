"""add revoked_tokens and fix departments unique constraint

Revision ID: a7f3e1d9c8b2
Revises: 66a68fb2ca31
Create Date: 2026-05-13

Değişiklikler:
1. revoked_tokens tablosu oluşturulur (G-5: refresh token revocation)
2. departments.name üzerine partial unique index eklenir — is_deleted=False olan
   kayıtlar arasında isim tekrarı engellenez (DB-1: unique constraint fix)
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'a7f3e1d9c8b2'
down_revision = '66a68fb2ca31'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ─── 1. revoked_tokens tablosu ────────────────────────────────────────────
    op.create_table(
        'revoked_tokens',
        sa.Column('jti', sa.String(64), primary_key=True, nullable=False,
                  comment='JWT ID — token benzersiz kimliği'),
        sa.Column('token_type', sa.String(10), nullable=False, server_default='refresh',
                  comment='Token tipi'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False,
                  comment='Token orijinal son kullanma tarihi'),
        sa.Column('revoked_at', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()'), nullable=False,
                  comment='Revoke edilme zamanı'),
    )
    op.create_index('ix_revoked_tokens_expires_at', 'revoked_tokens', ['expires_at'])

    # ─── 2. departments.name partial unique index ──────────────────────────────
    # Önceki migration is_deleted sütunu ekleyince unique constraint kaldırıldı.
    # Şimdi is_deleted=False olan aktif bölümler arasında isim tekrarını engelliyoruz.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_departments_name_active
        ON departments (name)
        WHERE is_deleted = false
        """
    )


def downgrade() -> None:
    op.drop_index('uq_departments_name_active', table_name='departments')
    op.drop_index('ix_revoked_tokens_expires_at', table_name='revoked_tokens')
    op.drop_table('revoked_tokens')
