"""Paket 4B: NotificationType enum'a REPORT_REVIEW_PENDING ekle

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-05-17

Haftalık scheduler (APScheduler) bu yeni bildirim tipini kullanır.
"""

from typing import Union
from alembic import op

revision = 'j4k5l6m7n8o9'
down_revision: Union[str, None] = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PG enum'una yeni değer ekle. Bu işlem transaction içinde çalıştırılamaz
    # → autocommit blokunda yap.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REPORT_REVIEW_PENDING'")


def downgrade() -> None:
    # PostgreSQL enum'dan değer çıkarma desteklemiyor.
    # Downgrade gerekirse: enum'u yeniden oluştur (mevcut bildirimleri başka tipe migrate et).
    # Şu an no-op bırakıyoruz; kritik bir migrasyon değil.
    pass
