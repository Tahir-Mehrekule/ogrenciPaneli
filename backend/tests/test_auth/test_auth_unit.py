"""
Auth Unit Testleri

Manager doğrulama fonksiyonlarını izole biçimde test eder.
DB gerekmez — saf iş mantığı testleri.
"""

import pytest
from unittest.mock import MagicMock

from app.common.exceptions import BadRequestException, ForbiddenException
from app.common.enums import UserRole
from app.common.validators import validate_school_email
from app.features.user.user_manager import validate_role_change, validate_self_delete


class TestValidateSchoolEmail:
    def test_gecerli_ogrenci_email(self):
        """@ogr. içeren email kabul edilir."""
        validate_school_email("ali@ogr.edu.tr")  # Hata fırlatmaz

    def test_gecerli_ogretmen_email(self):
        """Normal okul email'i kabul edilir."""
        validate_school_email("hoca@uni.edu.tr")  # Hata fırlatmaz


    def test_gecersiz_gmail(self):
        """Gmail adresi reddedilir."""
        with pytest.raises(BadRequestException):
            validate_school_email("ali@gmail.com")

    def test_gecersiz_hotmail(self):
        """Kişisel email reddedilir."""
        with pytest.raises(BadRequestException):
            validate_school_email("ali@hotmail.com")


class TestValidateRoleChange:
    def test_son_admin_rolü_değiştirilemez(self):
        """Sistemdeki son admin'in rolü değiştirilemez."""
        current_admin = MagicMock()
        current_admin.id = "admin-uuid"

        target_admin = MagicMock()
        target_admin.id = "target-uuid"
        target_admin.role = UserRole.ADMIN

        with pytest.raises(BadRequestException):
            validate_role_change(current_admin, target_admin, UserRole.STUDENT, admin_count=1)

    def test_birden_fazla_admin_varsa_değiştirilebilir(self):
        """2+ admin varsa rol değiştirme serbesttir."""
        current_admin = MagicMock()
        current_admin.id = "admin-uuid"

        target_admin = MagicMock()
        target_admin.id = "target-uuid"
        target_admin.role = UserRole.ADMIN

        validate_role_change(current_admin, target_admin, UserRole.TEACHER, admin_count=2)  # Hata yok

    def test_kullanici_kendi_rolünü_değiştiremez(self):
        """Kendi rolünü değiştirme → ForbiddenException."""
        user = MagicMock()
        user.id = "same-uuid"

        target = MagicMock()
        target.id = "same-uuid"
        target.role = UserRole.STUDENT

        with pytest.raises(ForbiddenException):
            validate_role_change(user, target, UserRole.ADMIN, admin_count=5)


class TestValidateSelfDelete:
    def test_kendini_silemez(self):
        """Kendi hesabını silme → ForbiddenException."""
        current = MagicMock()
        current.id = "same-uuid"

        target = MagicMock()
        target.id = "same-uuid"

        with pytest.raises(ForbiddenException):
            validate_self_delete(current, target)

    def test_baskasını_silebilir(self):
        """Başka kullanıcıyı silme serbesttir."""
        current = MagicMock()
        current.id = "my-uuid"

        target = MagicMock()
        target.id = "other-uuid"

        validate_self_delete(current, target)  # Hata yok
