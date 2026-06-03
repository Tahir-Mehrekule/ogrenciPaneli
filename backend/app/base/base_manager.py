"""
Base manager (temel yardımcı işlemler) modülü.

Tüm feature manager'larının türeyeceği base sınıfı tanımlar.
Manager katmanı; validasyon, iş kuralı kontrolü ve dış servis çağrılarını yönetir.
"""

from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.common.exceptions import ForbiddenException


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

    def __init__(self, db: Session = None):
        self.db = db

    @staticmethod
    def same_id(a, b) -> bool:
        """UUID/string id eşitlik kontrolü (tip farkını yok sayar)."""
        return str(a) == str(b)

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
        if self.same_id(getattr(entity, owner_field), user.id):
            return
        if allow_admin and user.role == UserRole.ADMIN:
            return
        raise ForbiddenException(f"Bu {entity_name} üzerinde işlem yapmaya yetkiniz yok")
