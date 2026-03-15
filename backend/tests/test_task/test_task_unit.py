"""
Task Unit Testleri

Görev durum geçişleri ve atanma kurallarını test eder.
"""

import pytest
from unittest.mock import MagicMock

from app.common.exceptions import BadRequestException, ForbiddenException
from app.common.enums import TaskStatus, UserRole
from app.features.task.task_manager import (
    validate_task_status_transition,
    validate_assignee_is_member,
)


class TestTaskStatusTransition:
    """Görev durum geçiş kuralları."""

    def test_todo_to_in_progress_student_yapabilir(self):
        """Öğrenci TODO → IN_PROGRESS yapabilir."""
        task = MagicMock()
        task.status = TaskStatus.TODO

        user = MagicMock()
        user.role = UserRole.STUDENT

        validate_task_status_transition(task, TaskStatus.IN_PROGRESS, user)  # Hata yok

    def test_review_to_done_student_yapamaz(self):
        """Öğrenci REVIEW → DONE yapamaz (sadece TEACHER/ADMIN)."""
        task = MagicMock()
        task.status = TaskStatus.REVIEW

        user = MagicMock()
        user.role = UserRole.STUDENT

        with pytest.raises(ForbiddenException):
            validate_task_status_transition(task, TaskStatus.DONE, user)

    def test_review_to_done_teacher_yapabilir(self):
        """Öğretmen REVIEW → DONE yapabilir."""
        task = MagicMock()
        task.status = TaskStatus.REVIEW

        user = MagicMock()
        user.role = UserRole.TEACHER

        validate_task_status_transition(task, TaskStatus.DONE, user)  # Hata yok

    def test_done_değiştirilemez(self):
        """DONE durumundan hiçbir duruma geçilemez."""
        task = MagicMock()
        task.status = TaskStatus.DONE

        user = MagicMock()
        user.role = UserRole.ADMIN

        with pytest.raises(BadRequestException):
            validate_task_status_transition(task, TaskStatus.IN_PROGRESS, user)

    def test_geçersiz_atlama(self):
        """TODO → DONE doğrudan atlama geçersizdir."""
        task = MagicMock()
        task.status = TaskStatus.TODO

        user = MagicMock()
        user.role = UserRole.ADMIN

        with pytest.raises(BadRequestException):
            validate_task_status_transition(task, TaskStatus.DONE, user)


class TestAssigneeIsMember:
    """Görev atanma kuralları."""

    def test_üye_olan_kişiye_atanabilir(self):
        """Proje üyesi olan kişiye görev atanabilir."""
        mock_repo = MagicMock()
        mock_repo.is_member.return_value = True

        validate_assignee_is_member("user-uuid", "project-uuid", mock_repo)  # Hata yok

    def test_üye_olmayan_kişiye_atanamaz(self):
        """Proje üyesi olmayan kişiye görev atanamaz → BadRequestException."""
        mock_repo = MagicMock()
        mock_repo.is_member.return_value = False

        with pytest.raises(BadRequestException):
            validate_assignee_is_member("user-uuid", "project-uuid", mock_repo)

    def test_atama_yoksa_kontrol_edilmez(self):
        """assigned_to=None ise kontrol yapılmaz."""
        mock_repo = MagicMock()
        validate_assignee_is_member(None, "project-uuid", mock_repo)  # Hata yok
        mock_repo.is_member.assert_not_called()
