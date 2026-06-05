"""
Base manager (temel yardımcı işlemler) modülü.

Tüm feature manager'larının türeyeceği base sınıfı tanımlar.
Manager katmanı; validasyon, iş kuralı kontrolü ve dış servis çağrılarını yönetir.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.common import authz


class BaseManager:
    """
    Tüm manager sınıflarının türeyeceği abstract base.

    Manager katmanının sorumlulukları:
    - İş kuralı validasyonu (durum geçişleri, sahiplik kontrolü)
    - Karmaşık koşul kontrolleri (çakışma, kota vb.)
    - Dış servis çağrıları (AI, e-posta vb.)

    Kullanım:
        class ProjectManager(BaseManager):
            def __init__(self, db: Session):
                super().__init__(db)

        class AIManager(BaseManager):
            def __init__(self):
                super().__init__()  # DB gerektirmeyen manager'lar
    """

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    # ── Yetkilendirme kısayolları (app.common.authz'a delege — tek kaynak) ──

    @staticmethod
    def same_id(a, b) -> bool:
        """UUID/string id eşitlik kontrolü (tip farkını yok sayar)."""
        return authz.ids_equal(a, b)

    def check_ownership(
        self,
        entity,
        owner_field: str,
        user,
        *,
        allow_admin: bool = True,
        entity_name: str = "kayıt",
    ) -> None:
        """
        Kullanıcının entity sahibi olup olmadığını kontrol eder.

        - Sahip ise (owner_field == user.id) izin verilir.
        - allow_admin=True ise ADMIN her zaman izinlidir.
        - Aksi halde ForbiddenException fırlatılır.
        """
        authz.require_owner_or_admin(
            entity, owner_field, user,
            allow_admin=allow_admin, entity_name=entity_name,
        )

    def require_admin(self, user, *, message: str = "Bu işlem sadece adminler tarafından yapılabilir") -> None:
        """ADMIN değilse ForbiddenException fırlatır."""
        authz.require_admin(user, message=message)
