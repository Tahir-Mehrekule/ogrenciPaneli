"""
Project Member service (iş mantığı) modülü.

Davet, katılım isteği, kabul/red, devir ve istifa işlemlerini yönetir.

Kurallar:
  - Arşivlenmiş projede hiçbir üyelik işlemi yapılamaz
  - MANAGER sadece kendi entry_year'ı olan kullanıcıları davet edebilir
    (entry_year null ise kısıt uygulanmaz)
  - Yönetici devretmeden istifa edemez
  - Admin ve Teacher herhangi bir üyeyi çıkarabilir, projeyi arşivleyebilir
  - Arşivleme yetkisi sadece Teacher ve Admin'dedir
"""

import secrets
import string
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from sqlalchemy.exc import IntegrityError

from app.base.base_service import BaseService
from app.common.enums import MemberRole, MemberStatus, UserRole, NotificationType
from app.common.notification_helper import send_notification
from app.common.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.features.auth.auth_repo import AuthRepo
from app.features.project.project_repo import ProjectRepo
from app.features.project_member.project_member_dto import (
    InviteMemberRequest,
    ProjectMemberResponse,
    PendingMemberResponse,
    MyInvitationResponse,
    TransferManagerRequest,
)
from app.features.project_member.project_member_model import ProjectMember
from app.features.project_member.project_member_repo import ProjectMemberRepo
from app.features.auth.auth_model import User


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_share_code(length: int = 8) -> str:
    """URL-safe alfanümerik kısa kod üretir."""
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class ProjectMemberService(BaseService[ProjectMember, ProjectMemberRepo]):
    """Proje üyesi yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        super().__init__(ProjectMemberRepo, db)
        self.project_repo = ProjectRepo(db)
        self.auth_repo = AuthRepo(db)

    # ── Listeleme ─────────────────────────────────────────────────────────────

    def list_active_members(self, project_id: UUID) -> list[ProjectMemberResponse]:
        """Projedeki ACTIVE üyeleri döner."""
        self.project_repo.get_by_id_or_404(project_id)
        members = self.repo.get_active_members(project_id)
        return [ProjectMemberResponse.model_validate(m) for m in members]

    def list_my_invitations(self, current_user: User) -> list[MyInvitationResponse]:
        """Kullanıcıya gelen INVITED kayıtlarını proje özetiyle döner."""
        records = self.repo.get_user_invitations(current_user.id)
        result: list[MyInvitationResponse] = []
        for r in records:
            project_status = None
            try:
                if r.project and r.project.status is not None:
                    project_status = (
                        r.project.status.value
                        if hasattr(r.project.status, "value")
                        else str(r.project.status)
                    )
            except Exception:
                pass
            result.append(MyInvitationResponse(
                id=r.id,
                created_at=r.created_at,
                updated_at=r.updated_at,
                project_id=r.project_id,
                status=r.status,
                invited_by=r.invited_by,
                project_title=(r.project.title if r.project else ""),
                project_description=(r.project.description if r.project else None),
                project_status=project_status,
                invited_by_name=(r.inviter.full_name if r.inviter else None),
            ))
        return result

    def list_pending(self, project_id: UUID, current_user: User) -> list[PendingMemberResponse]:
        """
        INVITED ve JOIN_REQUESTED kayıtları listeler.
        Sadece projenin MANAGER'ı, Teacher veya Admin görebilir.
        """
        self.project_repo.get_by_id_or_404(project_id)
        self._require_manager_or_staff(project_id, current_user)
        pending = self.repo.get_pending_members(project_id)
        return [PendingMemberResponse.model_validate(p) for p in pending]

    # ── Davet ─────────────────────────────────────────────────────────────────

    def invite_member(
        self,
        project_id: UUID,
        data: InviteMemberRequest,
        current_user: User,
    ) -> ProjectMemberResponse:
        """
        Yönetici bir kullanıcıya davet gönderir.

        Kurallar:
        - Sadece projenin MANAGER'ı veya Admin davet atabilir
        - Arşivlenmiş projede davet atılamaz
        - Sadece öğrenci davet edilebilir
        - Yöneticinin entry_year'ı varsa sadece aynı yıldan öğrenci davet edebilir
        - Zaten üye veya bekleyen kaydı olan kullanıcı davet edilemez
        """
        project = self.project_repo.get_by_id_or_404(project_id)

        if project.is_archived:
            raise BadRequestException("Arşivlenmiş projeye davet gönderilemez")

        self._require_manager_or_admin(project_id, current_user)

        target = self.auth_repo.get_by_id(data.user_id)
        if target is None:
            raise NotFoundException("Davet edilecek kullanıcı bulunamadı")

        if target.role != UserRole.STUDENT:
            raise BadRequestException("Projeye sadece öğrenci rolündeki kullanıcılar davet edilebilir")

        # Sınıf kısıtı: yöneticinin entry_year'ı varsa aynı sınıftan davet
        if current_user.role == UserRole.STUDENT and current_user.entry_year is not None:
            if target.entry_year != current_user.entry_year:
                raise BadRequestException(
                    f"Sadece kendi sınıfınızdaki ({current_user.grade_label or current_user.entry_year}) "
                    f"öğrencileri davet edebilirsiniz"
                )

        if self.repo.is_active_member(project_id, data.user_id):
            raise ConflictException("Bu kullanıcı projede zaten aktif üye")

        if self.repo.has_pending_record(project_id, data.user_id):
            raise ConflictException("Bu kullanıcı için zaten bekleyen bir davet veya katılım isteği var")

        # Race condition koruması: eş zamanlı iki istek DB unique constraint'i tetikler.
        # uq_project_member → IntegrityError → ConflictException (409) dönüştürülür.
        try:
            member = self.repo.create({
                "project_id": project_id,
                "user_id": data.user_id,
                "role": MemberRole.MEMBER,
                "status": MemberStatus.INVITED,
                "invited_by": current_user.id,
            })
        except IntegrityError:
            self.db.rollback()
            raise ConflictException("Bu kullanıcı için zaten bir üyelik kaydı oluşturuldu")

        # send_notification içindeki commit member instance'ını expire edebilir;
        # response'u önce hazırla, sonra bildirimi gönder.
        response = ProjectMemberResponse.model_validate(member)

        # Davet edilen kullanıcıya bildirim
        send_notification(
            db=self.db,
            user_id=data.user_id,
            type=NotificationType.SYSTEM_ALERT,
            title="Proje Daveti",
            message=f"'{project.title}' projesine davet edildiniz. Yanıtlamak için projeler sayfasını ziyaret edin.",
            related_id=project.id,
        )

        return response

    # ── Katılım İsteği ────────────────────────────────────────────────────────

    def request_join(self, project_id: UUID, current_user: User) -> ProjectMemberResponse:
        """
        Öğrenci share_code ile bulduğu projeye katılım isteği atar.

        Kurallar:
        - Sadece STUDENT rolü istek atabilir
        - Arşivlenmiş projede istek atılamaz
        - Zaten üye veya bekleyen kaydı olan kullanıcı istek atamaz
        """
        project = self.project_repo.get_by_id_or_404(project_id)

        if project.is_archived:
            raise BadRequestException("Arşivlenmiş projeye katılım isteği gönderilemez")

        if current_user.role != UserRole.STUDENT:
            raise BadRequestException("Sadece öğrenciler katılım isteği gönderebilir")

        if self.repo.is_active_member(project_id, current_user.id):
            raise ConflictException("Bu projede zaten aktif üyesiniz")

        if self.repo.has_pending_record(project_id, current_user.id):
            raise ConflictException("Bu proje için zaten bekleyen bir kaydınız var")

        # Race condition koruması: uq_project_member constraint → IntegrityError → 409.
        try:
            member = self.repo.create({
                "project_id": project_id,
                "user_id": current_user.id,
                "role": MemberRole.MEMBER,
                "status": MemberStatus.JOIN_REQUESTED,
            })
        except IntegrityError:
            self.db.rollback()
            raise ConflictException("Bu proje için zaten bir üyelik kaydınız mevcut")
        return ProjectMemberResponse.model_validate(member)

    # ── Kabul / Red ───────────────────────────────────────────────────────────

    def accept_member(self, project_id: UUID, member_id: UUID, current_user: User) -> ProjectMemberResponse:
        """
        Davet veya katılım isteğini kabul eder.

        İki senaryo:
        1. Kullanıcı kendi davetini kabul eder (INVITED → ACTIVE)
        2. Yönetici/Admin katılım isteğini kabul eder (JOIN_REQUESTED → ACTIVE)
        """
        self.project_repo.get_by_id_or_404(project_id)

        member = self.repo.get_member_by_id(member_id)
        if member is None or str(member.project_id) != str(project_id):
            raise NotFoundException("Üyelik kaydı bulunamadı")

        if member.status not in (MemberStatus.INVITED, MemberStatus.JOIN_REQUESTED):
            raise BadRequestException("Bu kayıt kabul edilebilir durumda değil")

        if member.status == MemberStatus.INVITED:
            # Sadece davet edilen kişi kabul edebilir
            if str(member.user_id) != str(current_user.id):
                raise ForbiddenException("Bu daveti kabul etme yetkiniz yok")
        else:
            # JOIN_REQUESTED: Yönetici veya Admin kabul eder
            self._require_manager_or_admin(project_id, current_user)

        member.status = MemberStatus.ACTIVE
        member.joined_at = _now()
        member.responded_at = _now()
        self.db.commit()
        self.db.refresh(member)
        return ProjectMemberResponse.model_validate(member)

    def reject_member(self, project_id: UUID, member_id: UUID, current_user: User) -> dict:
        """
        Davet veya katılım isteğini reddeder.

        İki senaryo:
        1. Kullanıcı kendi davetini reddeder (INVITED → REJECTED)
        2. Yönetici/Admin katılım isteğini reddeder (JOIN_REQUESTED → REJECTED)
        """
        self.project_repo.get_by_id_or_404(project_id)

        member = self.repo.get_member_by_id(member_id)
        if member is None or str(member.project_id) != str(project_id):
            raise NotFoundException("Üyelik kaydı bulunamadı")

        if member.status not in (MemberStatus.INVITED, MemberStatus.JOIN_REQUESTED):
            raise BadRequestException("Bu kayıt reddedilebilir durumda değil")

        if member.status == MemberStatus.INVITED:
            if str(member.user_id) != str(current_user.id):
                raise ForbiddenException("Bu daveti reddetme yetkiniz yok")
        else:
            self._require_manager_or_admin(project_id, current_user)

        member.status = MemberStatus.REJECTED
        member.responded_at = _now()
        self.db.commit()
        return {"message": "Reddedildi"}

    def cancel_invite(self, project_id: UUID, member_id: UUID, current_user: User) -> dict:
        """
        Gönderilen daveti iptal eder (INVITED → hard delete).

        Sadece projenin MANAGER'ı veya Admin çağırabilir.
        Davet kabul edilmişse (ACTIVE) iptal edilemez; bunun yerine remove_member kullanılır.
        """
        self.project_repo.get_by_id_or_404(project_id)
        self._require_manager_or_admin(project_id, current_user)

        member = self.repo.get_member_by_id(member_id)
        if member is None or str(member.project_id) != str(project_id):
            raise NotFoundException("Üyelik kaydı bulunamadı")

        if member.status != MemberStatus.INVITED:
            raise BadRequestException(
                "Yalnızca beklemedeki (INVITED) davetler iptal edilebilir. "
                "Aktif üyeyi çıkarmak için üye çıkarma endpoint'ini kullanın."
            )

        self.db.delete(member)
        self.db.commit()
        return {"message": "Davet iptal edildi"}

    # ── Üye Çıkarma ───────────────────────────────────────────────────────────

    def remove_member(self, project_id: UUID, user_id: UUID, current_user: User) -> dict:
        """
        Aktif üyeyi projeden çıkarır.

        Yetkiler:
        - Projenin MANAGER'ı → kendisi hariç MEMBER'ları çıkarabilir
        - Teacher / Admin → yönetici dahil herkesi çıkarabilir
          (yönetici çıkarılırsa başka aktif üye varsa devir gerekir,
           Teacher/Admin doğrudan siler)

        Proje sahibini (project.created_by) çıkarmak için önce yöneticilik devri şart değildir;
        Teacher/Admin bu kısıtın dışındadır.
        """
        project = self.project_repo.get_by_id_or_404(project_id)

        if project.is_archived:
            raise BadRequestException("Arşivlenmiş projeden üye çıkarılamaz")

        is_staff = current_user.role in (UserRole.TEACHER, UserRole.ADMIN)
        is_manager = self.repo.is_manager(project_id, current_user.id)

        if not is_staff and not is_manager:
            raise ForbiddenException("Üye çıkarma yetkiniz yok")

        member = self.repo.get_member_record(project_id, user_id)
        if member is None or member.status != MemberStatus.ACTIVE:
            raise NotFoundException("Bu kullanıcı projede aktif üye değil")

        # Yönetici (manager) çıkarılıyorsa ve kaldıran Teacher/Admin değilse engelle
        if member.role == MemberRole.MANAGER and not is_staff:
            raise ForbiddenException("Yöneticiyi çıkaramazsınız; önce yöneticilik devrini yapın")

        # Yönetici kendi kendini çıkaramaz (istifa farklı endpoint)
        if str(member.user_id) == str(current_user.id) and is_manager:
            raise BadRequestException("Kendinizi çıkarmak için 'istifa' işlemini kullanın")

        self.repo.delete(member.id)
        return {"message": "Üye projeden çıkarıldı"}

    # ── Yöneticilik Devri ─────────────────────────────────────────────────────

    def transfer_manager(
        self,
        project_id: UUID,
        data: TransferManagerRequest,
        current_user: User,
    ) -> dict:
        """
        Yöneticilik devri.

        - Sadece mevcut MANAGER veya Admin yapabilir
        - Hedef kullanıcı projede ACTIVE MEMBER olmalı
        - Eski yönetici MEMBER olur, yeni kullanıcı MANAGER olur
        """
        self.project_repo.get_by_id_or_404(project_id)

        is_admin = current_user.role == UserRole.ADMIN
        is_manager = self.repo.is_manager(project_id, current_user.id)

        if not is_admin and not is_manager:
            raise ForbiddenException("Yöneticilik devri için yetkiniz yok")

        if str(data.user_id) == str(current_user.id):
            raise BadRequestException("Yöneticilik kendinize devredilemez")

        new_manager_record = self.repo.get_member_record(project_id, data.user_id)
        if new_manager_record is None or new_manager_record.status != MemberStatus.ACTIVE:
            raise NotFoundException("Hedef kullanıcı projede aktif üye değil")

        if new_manager_record.role == MemberRole.MANAGER:
            raise ConflictException("Bu kullanıcı zaten projenin yöneticisi")

        # Eski yöneticiyi MEMBER yap
        old_manager = self.repo.get_manager(project_id)
        if old_manager:
            old_manager.role = MemberRole.MEMBER
            self.db.flush()

        # Yeni yöneticiyi ata
        new_manager_record.role = MemberRole.MANAGER
        self.db.commit()

        return {"message": "Yöneticilik başarıyla devredildi"}

    # ── İstifa ────────────────────────────────────────────────────────────────

    def resign(self, project_id: UUID, current_user: User) -> dict:
        """
        Kullanıcı projeden istifa eder.

        - MANAGER istifa edemez; önce yöneticilik devretmeli
        - MEMBER direkt istifa edebilir
        """
        self.project_repo.get_by_id_or_404(project_id)

        member = self.repo.get_member_record(project_id, current_user.id)
        if member is None or member.status != MemberStatus.ACTIVE:
            raise NotFoundException("Bu projede aktif üye değilsiniz")

        if member.role == MemberRole.MANAGER:
            active_count = self.repo.count_active_members(project_id)
            if active_count > 1:
                raise BadRequestException(
                    "Yönetici olarak istifa etmeden önce başka bir üyeye yöneticilik devredin"
                )
            # Tek üye kaldıysa (sadece yönetici) istifa edebilir
        self.repo.delete(member.id)
        return {"message": "Projeden başarıyla ayrıldınız"}

    # ── Arşivleme ─────────────────────────────────────────────────────────────

    def archive_project(self, project_id: UUID, current_user: User) -> dict:
        """Projeyi arşivler. Sadece Teacher ve Admin yapabilir."""
        project = self.project_repo.get_by_id_or_404(project_id)

        if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
            raise ForbiddenException("Arşivleme yetkisi yalnızca öğretmen ve adminlere aittir")

        if project.is_archived:
            raise ConflictException("Proje zaten arşivlenmiş")

        project.is_archived = True
        project.archived_by = current_user.id
        project.archived_at = _now()
        self.db.commit()
        return {"message": "Proje arşivlendi"}

    def unarchive_project(self, project_id: UUID, current_user: User) -> dict:
        """Projeyi arşivden çıkarır. Sadece Teacher ve Admin yapabilir."""
        project = self.project_repo.get_by_id_or_404(project_id)

        if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
            raise ForbiddenException("Arşivden çıkarma yetkisi yalnızca öğretmen ve adminlere aittir")

        if not project.is_archived:
            raise ConflictException("Proje arşivde değil")

        project.is_archived = False
        project.archived_by = None
        project.archived_at = None
        self.db.commit()
        return {"message": "Proje arşivden çıkarıldı"}

    # ── Yardımcı metodlar ────────────────────────────────────────────────────

    def _is_project_creator(self, project_id: UUID, user_id: UUID) -> bool:
        """Kullanıcı projenin sahibi (created_by) mi?"""
        project = self.project_repo.get_by_id(project_id)
        return bool(project and str(project.created_by) == str(user_id))

    def _require_manager_or_admin(self, project_id: UUID, user: User) -> None:
        if user.role == UserRole.ADMIN:
            return
        if self._is_project_creator(project_id, user.id):
            return
        if not self.repo.is_manager(project_id, user.id):
            raise ForbiddenException("Bu işlem için proje yöneticisi veya admin olmanız gerekiyor")

    def _require_manager_or_staff(self, project_id: UUID, user: User) -> None:
        if user.role in (UserRole.TEACHER, UserRole.ADMIN):
            return
        if self._is_project_creator(project_id, user.id):
            return
        if not self.repo.is_manager(project_id, user.id):
            raise ForbiddenException("Bu bilgiyi görme yetkiniz yok")
