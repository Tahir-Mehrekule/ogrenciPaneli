"""
Project Unit Testleri

Proje durum geçiş kurallarını ve yetki doğrulamalarını test eder.
"""

import pytest
from unittest.mock import MagicMock

from app.common.exceptions import BadRequestException, ForbiddenException
from app.common.enums import ProjectStatus, UserRole
from app.features.project.project_manager import (
    validate_status_transition,
    validate_project_owner,
)


class TestStatusTransition:
    """Proje durum geçiş kuralları."""

    def test_draft_to_pending_gecerli(self):
        """DRAFT → PENDING geçişi geçerlidir."""
        validate_status_transition(ProjectStatus.DRAFT, ProjectStatus.PENDING)  # Hata yok

    def test_draft_to_approved_gecersiz(self):
        """DRAFT → APPROVED doğrudan geçilemez."""
        with pytest.raises(BadRequestException):
            validate_status_transition(ProjectStatus.DRAFT, ProjectStatus.APPROVED)

    def test_completed_proje_değiştirilemez(self):
        """COMPLETED projeden hiçbir duruma geçilemez."""
        with pytest.raises(BadRequestException):
            validate_status_transition(ProjectStatus.COMPLETED, ProjectStatus.IN_PROGRESS)

    def test_approved_to_in_progress_gecerli(self):
        """APPROVED → IN_PROGRESS geçerlidir."""
        validate_status_transition(ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS)  # Hata yok

    def test_rejected_to_draft_gecerli(self):
        """Reddedilen proje tekrar DRAFT'a alınabilir."""
        validate_status_transition(ProjectStatus.REJECTED, ProjectStatus.DRAFT)  # Hata yok


class TestValidateProjectOwner:
    """Proje sahibi doğrulama."""

    def test_sahip_erişebilir(self):
        """Proje sahibi düzenleme yapabilir."""
        project = MagicMock()
        project.created_by = "user-123"

        user = MagicMock()
        user.id = "user-123"
        user.role = UserRole.STUDENT

        validate_project_owner(project, user)  # Hata yok

    def test_admin_erişebilir(self):
        """ADMIN her projeyi düzenleyebilir."""
        project = MagicMock()
        project.created_by = "someone-else"

        user = MagicMock()
        user.id = "admin-uuid"
        user.role = UserRole.ADMIN

        validate_project_owner(project, user)  # Hata yok

    def test_yabancı_kullanıcı_erişemez(self):
        """Başkasının projesini düzenleme → ForbiddenException."""
        project = MagicMock()
        project.created_by = "owner-uuid"

        user = MagicMock()
        user.id = "other-uuid"
        user.role = UserRole.STUDENT

        with pytest.raises(ForbiddenException):
            validate_project_owner(project, user)
