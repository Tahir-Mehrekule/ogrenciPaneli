"""
Report Unit Testleri

Haftalık rapor kurallarını test eder:
- Haftada 1 rapor kısıtı
- Sadece DRAFT'lar düzenlenebilir
- ISO hafta hesaplama
"""

import pytest
from unittest.mock import MagicMock

pytestmark = pytest.mark.unit

from app.common.exceptions import BadRequestException, ForbiddenException, ConflictException
from app.common.enums import ReportStatus
from app.features.report.report_manager import ReportManager


class TestWeeklyUniqueness:
    """Aynı haftada duplicate rapor kontrolü."""

    def setup_method(self):
        self.manager = ReportManager(db=MagicMock())
        self.manager.repo = MagicMock()

    def test_ilk_rapor_oluşturulabilir(self):
        """Bu hafta için rapor yoksa oluşturulabilir."""
        self.manager.repo.get_by_week.return_value = None
        self.manager.validate_weekly_uniqueness("proj-uuid", "user-uuid", 10, 2026)  # Hata yok

    def test_aynı_haftada_ikinci_rapor_reddedilir(self):
        """Bu hafta için zaten rapor varsa → ConflictException."""
        self.manager.repo.get_by_week.return_value = MagicMock()

        with pytest.raises(ConflictException):
            self.manager.validate_weekly_uniqueness("proj-uuid", "user-uuid", 10, 2026)


class TestReportEditable:
    """Sadece DRAFT raporlar düzenlenebilir."""

    def setup_method(self):
        self.manager = ReportManager(db=MagicMock())

    def test_draft_rapor_düzenlenebilir(self):
        """DRAFT rapor düzenlemeye açıktır."""
        report = MagicMock()
        report.status = ReportStatus.DRAFT
        self.manager.validate_report_editable(report)  # Hata yok

    def test_submitted_rapor_düzenlenemez(self):
        """SUBMITTED rapor düzenlenemez → ForbiddenException."""
        report = MagicMock()
        report.status = ReportStatus.SUBMITTED
        with pytest.raises(ForbiddenException):
            self.manager.validate_report_editable(report)

    def test_reviewed_rapor_düzenlenemez(self):
        """REVIEWED rapor düzenlenemez → ForbiddenException."""
        report = MagicMock()
        report.status = ReportStatus.REVIEWED
        with pytest.raises(ForbiddenException):
            self.manager.validate_report_editable(report)


class TestReportSubmittable:
    """Sadece DRAFT raporlar teslim edilebilir."""

    def setup_method(self):
        self.manager = ReportManager(db=MagicMock())

    def test_draft_teslim_edilebilir(self):
        """DRAFT → SUBMITTED geçişi mümkündür."""
        report = MagicMock()
        report.status = ReportStatus.DRAFT
        self.manager.validate_report_submittable(report)  # Hata yok

    def test_submitted_tekrar_teslim_edilemez(self):
        """SUBMITTED rapor tekrar teslim edilemez → BadRequestException."""
        report = MagicMock()
        report.status = ReportStatus.SUBMITTED
        with pytest.raises(BadRequestException):
            self.manager.validate_report_submittable(report)


class TestReportOwner:
    """Rapor sahibi doğrulama."""

    def setup_method(self):
        self.manager = ReportManager(db=MagicMock())

    def test_sahip_erişebilir(self):
        """Raporun sahibi işlem yapabilir."""
        report = MagicMock()
        report.submitted_by = "user-uuid"
        user = MagicMock()
        user.id = "user-uuid"
        self.manager.validate_report_owner(report, user)  # Hata yok

    def test_başkasının_raporu_düzenlenemez(self):
        """Başkasının raporu üzerinde işlem yapılamaz → ForbiddenException."""
        report = MagicMock()
        report.submitted_by = "owner-uuid"
        user = MagicMock()
        user.id = "other-uuid"
        with pytest.raises(ForbiddenException):
            self.manager.validate_report_owner(report, user)


class TestGetCurrentWeekAndYear:
    """ISO hafta ve yıl hesaplama."""

    def setup_method(self):
        self.manager = ReportManager(db=MagicMock())

    def test_dönen_değerler_geçerli_aralıkta(self):
        """Hafta numarası 1–53, yıl > 2020 olmalı."""
        week, year = self.manager.get_current_week_and_year()
        assert 1 <= week <= 53
        assert year >= 2020
