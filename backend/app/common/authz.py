"""
Yetkilendirme (authorization) yardımcıları — tek kaynak (DRY).

Servis ve manager katmanlarında tekrar eden sahiplik/rol kontrollerini
saf fonksiyonlar olarak toplar. DB erişimi yoktur; yalnızca verilen
entity ve user üzerinde mantık yürütür.

Kullanım:
    from app.common import authz

    authz.require_admin(current_user)
    authz.require_owner_or_admin(project, "created_by", current_user, entity_name="proje")
    if authz.is_owner(report, "submitted_by", current_user):
        ...

BaseService ve BaseManager bu fonksiyonları self.* kısayolları olarak da sunar.
"""

from app.common.enums import UserRole
from app.common.exceptions import ForbiddenException


def ids_equal(a, b) -> bool:
    """UUID/string id eşitlik kontrolü (tip farkını yok sayar)."""
    return str(a) == str(b)


def is_admin(user) -> bool:
    """Kullanıcı ADMIN mi?"""
    return user.role == UserRole.ADMIN


def is_owner(entity, owner_field: str, user) -> bool:
    """entity.<owner_field> == user.id mi?"""
    return ids_equal(getattr(entity, owner_field), user.id)


def require_admin(
    user,
    *,
    message: str = "Bu işlem sadece adminler tarafından yapılabilir",
) -> None:
    """ADMIN değilse ForbiddenException fırlatır."""
    if not is_admin(user):
        raise ForbiddenException(message)


def require_owner_or_admin(
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
    if is_owner(entity, owner_field, user):
        return
    if allow_admin and is_admin(user):
        return
    raise ForbiddenException(f"Bu {entity_name} üzerinde işlem yapmaya yetkiniz yok")


def require_course_owner_if_teacher(
    course,
    user,
    *,
    message: str = "Sadece kendi dersiniz üzerinde işlem yapabilirsiniz",
) -> None:
    """
    TEACHER ise dersin sahibi (course.teacher_id == user.id) olmalıdır.
    ADMIN her zaman geçer. STUDENT bu noktaya gelmeden engellenmiş varsayılır.
    """
    if user.role == UserRole.TEACHER and not ids_equal(course.teacher_id, user.id):
        raise ForbiddenException(message)
