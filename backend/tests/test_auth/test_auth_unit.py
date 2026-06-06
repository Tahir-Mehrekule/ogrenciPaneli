"""
Auth Unit Testleri

Manager doğrulama fonksiyonlarını izole biçimde test eder.
DB gerekmez — saf iş mantığı testleri.
"""

import pytest
from unittest.mock import MagicMock

pytestmark = pytest.mark.unit

from app.common.exceptions import (
    BadRequestException,
    ForbiddenException,
    UnauthorizedException,
)
from app.common.enums import UserRole
from app.common.validators import validate_school_email, validate_password_strength
from app.features.user.user_manager import UserManager
from app.features.auth import auth_manager as auth_manager_mod
from app.features.auth.auth_manager import AuthManager


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
    def setup_method(self):
        self.manager = UserManager(db=None)

    def test_son_admin_rolü_değiştirilemez(self):
        """Sistemdeki son admin'in rolü değiştirilemez."""
        current_admin = MagicMock()
        current_admin.id = "admin-uuid"

        target_admin = MagicMock()
        target_admin.id = "target-uuid"
        target_admin.role = UserRole.ADMIN

        with pytest.raises(BadRequestException):
            self.manager.validate_role_change(current_admin, target_admin, UserRole.STUDENT, admin_count=1)

    def test_birden_fazla_admin_varsa_değiştirilebilir(self):
        """2+ admin varsa rol değiştirme serbesttir."""
        current_admin = MagicMock()
        current_admin.id = "admin-uuid"

        target_admin = MagicMock()
        target_admin.id = "target-uuid"
        target_admin.role = UserRole.ADMIN

        self.manager.validate_role_change(current_admin, target_admin, UserRole.TEACHER, admin_count=2)  # Hata yok

    def test_kullanici_kendi_rolünü_değiştiremez(self):
        """Kendi rolünü değiştirme → ForbiddenException."""
        user = MagicMock()
        user.id = "same-uuid"

        target = MagicMock()
        target.id = "same-uuid"
        target.role = UserRole.STUDENT

        with pytest.raises(ForbiddenException):
            self.manager.validate_role_change(user, target, UserRole.ADMIN, admin_count=5)


class TestValidateSelfDelete:
    def setup_method(self):
        self.manager = UserManager(db=None)

    def test_kendini_silemez(self):
        """Kendi hesabını silme → ForbiddenException."""
        current = MagicMock()
        current.id = "same-uuid"

        target = MagicMock()
        target.id = "same-uuid"

        with pytest.raises(ForbiddenException):
            self.manager.validate_self_delete(current, target)

    def test_baskasını_silebilir(self):
        """Başka kullanıcıyı silme serbesttir."""
        current = MagicMock()
        current.id = "my-uuid"

        target = MagicMock()
        target.id = "other-uuid"

        self.manager.validate_self_delete(current, target)  # Hata yok


class TestValidatePasswordStrength:
    def test_kisa_sifre_reddedilir(self):
        with pytest.raises(BadRequestException):
            validate_password_strength("Ab1")

    def test_buyuk_harf_yoksa_reddedilir(self):
        with pytest.raises(BadRequestException):
            validate_password_strength("abcd1234")

    def test_rakam_yoksa_reddedilir(self):
        with pytest.raises(BadRequestException):
            validate_password_strength("Abcdefgh")

    def test_guclu_sifre_kabul(self):
        validate_password_strength("Abcd1234")  # Hata yok


class TestValidatePasswordChange:
    def setup_method(self):
        self.manager = AuthManager(db=None)
        self.user = MagicMock()
        self.user.password_hash = "hashed"

    def test_yanlis_mevcut_sifre(self, monkeypatch):
        """Mevcut şifre yanlışsa → 401."""
        monkeypatch.setattr(auth_manager_mod, "verify_password", lambda p, h: False)
        with pytest.raises(UnauthorizedException):
            self.manager.validate_password_change(self.user, "yanlis", "Abcd1234")

    def test_zayif_yeni_sifre(self, monkeypatch):
        """Mevcut doğru ama yeni şifre zayıf → BadRequest."""
        monkeypatch.setattr(auth_manager_mod, "verify_password", lambda p, h: p == "dogru")
        with pytest.raises(BadRequestException):
            self.manager.validate_password_change(self.user, "dogru", "zayif")

    def test_ayni_sifre(self, monkeypatch):
        """Yeni şifre eskiyle aynı → BadRequest."""
        # Hem mevcut hem yeni doğrulamada True döner (aynı şifre)
        monkeypatch.setattr(auth_manager_mod, "verify_password", lambda p, h: True)
        with pytest.raises(BadRequestException):
            self.manager.validate_password_change(self.user, "Abcd1234", "Abcd1234")

    def test_basarili(self, monkeypatch):
        """Mevcut doğru, yeni güçlü ve farklı → hata yok."""
        calls = iter([True, False])  # 1: mevcut doğru, 2: yeni eskiden farklı
        monkeypatch.setattr(auth_manager_mod, "verify_password", lambda p, h: next(calls))
        self.manager.validate_password_change(self.user, "dogru", "Yeni1234")


class TestValidateResetPassword:
    def setup_method(self):
        self.manager = AuthManager(db=None)

    def test_token_yok(self):
        with pytest.raises(BadRequestException):
            self.manager.validate_reset_password(None, "Abcd1234")

    def test_token_suresi_dolmus(self):
        token = MagicMock()
        token.is_expired.return_value = True
        with pytest.raises(BadRequestException):
            self.manager.validate_reset_password(token, "Abcd1234")

    def test_gecerli_token_zayif_sifre(self):
        token = MagicMock()
        token.is_expired.return_value = False
        with pytest.raises(BadRequestException):
            self.manager.validate_reset_password(token, "zayif")

    def test_gecerli_token_guclu_sifre(self):
        token = MagicMock()
        token.is_expired.return_value = False
        self.manager.validate_reset_password(token, "Abcd1234")  # Hata yok


class TestValidateRefreshToken:
    def setup_method(self):
        self.manager = AuthManager(db=None)

    def test_gecersiz_token(self, monkeypatch):
        monkeypatch.setattr(auth_manager_mod, "verify_token", lambda t: None)
        with pytest.raises(UnauthorizedException):
            self.manager.validate_refresh_token("bad")

    def test_yanlis_tip(self, monkeypatch):
        monkeypatch.setattr(auth_manager_mod, "verify_token", lambda t: {"type": "access", "sub": "u1"})
        with pytest.raises(UnauthorizedException):
            self.manager.validate_refresh_token("access-token")

    def test_sub_yok(self, monkeypatch):
        monkeypatch.setattr(auth_manager_mod, "verify_token", lambda t: {"type": "refresh"})
        with pytest.raises(UnauthorizedException):
            self.manager.validate_refresh_token("no-sub")

    def test_gecerli_token_tuple_doner(self, monkeypatch):
        monkeypatch.setattr(
            auth_manager_mod, "verify_token",
            lambda t: {"type": "refresh", "sub": "u1", "jti": "j1", "exp": 123},
        )
        user_id, jti, exp = self.manager.validate_refresh_token("ok")
        assert (user_id, jti, exp) == ("u1", "j1", 123)


class TestResolveStudentClass:
    def setup_method(self):
        self.manager = AuthManager(db=None)

    def test_student_no_yok(self):
        assert self.manager.resolve_student_class(None) == (None, None)

    def test_eslesme_yok(self, monkeypatch):
        repo = MagicMock()
        repo.match_student_no.return_value = None
        monkeypatch.setattr(auth_manager_mod, "StudentPrefixRepo", lambda db: repo)
        assert self.manager.resolve_student_class("245235024") == (None, None)

    def test_eslesme_var(self, monkeypatch):
        match = MagicMock()
        match.entry_year = 2024
        match.label = "1. Sınıf"
        repo = MagicMock()
        repo.match_student_no.return_value = match
        monkeypatch.setattr(auth_manager_mod, "StudentPrefixRepo", lambda db: repo)
        assert self.manager.resolve_student_class("245235024") == (2024, "1. Sınıf")
