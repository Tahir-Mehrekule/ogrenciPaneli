"""
Base manager (temel yardımcı işlemler) modülü.

Tüm feature manager'larının türeyeceği base sınıfı tanımlar.
Manager katmanı; validasyon, iş kuralı kontrolü ve dış servis çağrılarını yönetir.
"""

from sqlalchemy.orm import Session


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
