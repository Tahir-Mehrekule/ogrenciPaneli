"""add rejected_at column to projects

Revision ID: c3d5e7g9h0i2
Revises: b2c4d6e8f0a1
Create Date: 2026-05-13

Değişiklikler:
1. projects.rejected_at kolonu eklenir (BL-4: reddedilen proje tekrar gönderim validasyonu)
   - Proje REJECTED durumuna geçince bu alan set edilir
   - İçerik (title/description) PATCH ile değiştirilince None'a çekilir
   - submit_for_approval çağrısında rejected_at None değilse = içerik değiştirilmeden
     tekrar gönderim girişimi → 400 hatası
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'c3d5e7g9h0i2'
down_revision = 'b2c4d6e8f0a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'projects',
        sa.Column(
            'rejected_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment=(
                'Reddetme zamanı. None ise içerik değiştirilmiş veya hiç reddedilmemiş.'
            ),
        ),
    )


def downgrade() -> None:
    op.drop_column('projects', 'rejected_at')
