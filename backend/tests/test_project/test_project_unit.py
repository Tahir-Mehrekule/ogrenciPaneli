"""
Project Unit Testleri

Proje durum geçiş kurallarını ve yetki doğrulamalarını test eder.
"""

import pytest
from unittest.mock import MagicMock

pytestmark = pytest.mark.unit

from app.common.exceptions import BadRequestException, ForbiddenException
from app.common.enums import ProjectStatus, UserRole
from app.features.project.project_manager import ProjectManager


class TestStatusTransition:
    """Proje durum geçiş kuralları."""

    def setup_method(self):
        self.manager = ProjectManager(db=None)

    def test_draft_to_pending_gecerli(self):
        """DRAFT → PENDING geçişi geçerlidir."""
        self.manager.validate_status_transition(ProjectStatus.DRAFT, ProjectStatus.PENDING)  # Hata yok

    def test_draft_to_approved_gecersiz(self):
        """DRAFT → APPROVED doğrudan geçilemez."""
        with pytest.raises(BadRequestException):
            self.manager.validate_status_transition(ProjectStatus.DRAFT, ProjectStatus.APPROVED)

    def test_completed_proje_değiştirilemez(self):
        """COMPLETED projeden hiçbir duruma geçilemez."""
        with pytest.raises(BadRequestException):
            self.manager.validate_status_transition(ProjectStatus.COMPLETED, ProjectStatus.IN_PROGRESS)

    def test_approved_to_in_progress_gecerli(self):
        """APPROVED → IN_PROGRESS geçerlidir."""
        self.manager.validate_status_transition(ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS)  # Hata yok

    def test_rejected_to_draft_gecerli(self):
        """Reddedilen proje tekrar DRAFT'a alınabilir."""
        self.manager.validate_status_transition(ProjectStatus.REJECTED, ProjectStatus.DRAFT)  # Hata yok


class TestValidateProjectOwner:
    """Proje sahibi doğrulama."""

    def setup_method(self):
        self.manager = ProjectManager(db=None)

    def test_sahip_erişebilir(self):
        """Proje sahibi düzenleme yapabilir."""
        project = MagicMock()
        project.created_by = "user-123"

        user = MagicMock()
        user.id = "user-123"
        user.role = UserRole.STUDENT

        self.manager.validate_project_owner(project, user)  # Hata yok

    def test_admin_erişebilir(self):
        """ADMIN her projeyi düzenleyebilir."""
        project = MagicMock()
        project.created_by = "someone-else"

        user = MagicMock()
        user.id = "admin-uuid"
        user.role = UserRole.ADMIN

        self.manager.validate_project_owner(project, user)  # Hata yok

    def test_yabancı_kullanıcı_erişemez(self):
        """Başkasının projesini düzenleme → ForbiddenException."""
        project = MagicMock()
        project.created_by = "owner-uuid"

        user = MagicMock()
        user.id = "other-uuid"
        user.role = UserRole.STUDENT

        with pytest.raises(ForbiddenException):
            self.manager.validate_project_owner(project, user)


class TestValidateDeletable:
    """Proje silinebilirlik kontrolü."""

    def setup_method(self):
        self.manager = ProjectManager(db=None)

    def test_draft_silinebilir(self):
        """DRAFT proje sahibi tarafından silinebilir."""
        project = MagicMock()
        project.created_by = "owner-uuid"
        project.status = ProjectStatus.DRAFT

        user = MagicMock()
        user.id = "owner-uuid"
        user.role = UserRole.STUDENT

        self.manager.validate_deletable(project, user)  # Hata yok

    def test_approved_silinemez(self):
        """APPROVED proje silinemez."""
        project = MagicMock()
        project.created_by = "owner-uuid"
        project.status = ProjectStatus.APPROVED

        user = MagicMock()
        user.id = "owner-uuid"
        user.role = UserRole.STUDENT

        with pytest.raises(ForbiddenException):
            self.manager.validate_deletable(project, user)
