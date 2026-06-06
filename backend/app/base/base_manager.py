"""
Base manager (temel yardımcı işlemler) modülü.

Tüm feature manager'larının VE BaseService'in türeyeceği base sınıf.
Manager katmanı; validasyon, iş kuralı kontrolü ve dış servis çağrılarını yönetir.

Yetkilendirme kısayolları (ids_equal, is_owner, require_admin,
require_owner_or_admin, require_course_owner_if_teacher) burada tanımlanır ve
tüm mantığı app.common.authz'a delege eder (tek-kaynak — DRY). BaseService bu
sınıftan türediği için aynı kısayolları paylaşır; tekrar tanımlanmaz.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.common import authz


class BaseManager:
    """
    Tüm manager sınıflarının ve BaseService'in türeyeceği base.

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
    def ids_equal(a, b) -> bool:
        """UUID/string id eşitlik kontrolü (tip farkını yok sayar)."""
        return authz.ids_equal(a, b)

    @staticmethod
    def is_owner(entity, owner_field: str, user) -> bool:
        """entity.<owner_field> == user.id mi?"""
        return authz.is_owner(entity, owner_field, user)

    def require_admin(
        self,
        user,
        *,
        message: str = "Bu işlem sadece adminler tarafından yapılabilir",
    ) -> None:
        """ADMIN değilse ForbiddenException fırlatır."""
        authz.require_admin(user, message=message)

    def require_owner_or_admin(
        self,
        entity,
        owner_field: str,
        user,
        *,
        allow_admin: bool = True,
        entity_name: str = "kayıt",
    ) -> None:
        """Sahip değilse (ve allow_admin ise admin değilse) ForbiddenException fırlatır."""
        authz.require_owner_or_admin(
            entity, owner_field, user,
            allow_admin=allow_admin, entity_name=entity_name,
        )

    def require_course_owner_if_teacher(
        self,
        course,
        user,
        *,
        message: str = "Sadece kendi dersiniz üzerinde işlem yapabilirsiniz",
    ) -> None:
        """TEACHER ise dersin sahibi olmalı; ADMIN her zaman geçer."""
        authz.require_course_owner_if_teacher(course, user, message=message)
