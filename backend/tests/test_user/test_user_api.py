"""
User Integration Testleri

Kullanıcı listeleme, güncelleme ve silme endpoint akışlarını test eder.
PostgreSQL test DB kullanır (conftest.py'dan).
"""

import pytest


class TestUserList:
    def test_admin_tüm_kullanıcıları_listeler(self, client, student_user, teacher_user, admin_token):
        """Admin tüm kullanıcıları görebilir → 200."""
        resp = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 2

    def test_teacher_kullanıcıları_listeler(self, client, student_user, teacher_token):
        """Teacher kullanıcıları listeleyebilir → 200."""
        resp = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert resp.status_code == 200

    def test_student_kullanıcıları_listeleyemez(self, client, student_token):
        """Student kullanıcı listesine erişemez → 403."""
        resp = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403

    def test_token_olmadan_erişilemez(self, client):
        """Token olmadan liste → 401."""
        resp = client.get("/api/v1/users")
        assert resp.status_code == 401


class TestUserGet:
    def test_admin_kullanıcı_detayını_görür(self, client, student_user, admin_token):
        """Admin belirli kullanıcının detayını görebilir."""
        resp = client.get(
            f"/api/v1/users/{student_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "student@ogr.uni.edu.tr"

    def test_olmayan_kullanıcı_404(self, client, admin_token):
        """Olmayan kullanıcı → 404."""
        resp = client.get(
            "/api/v1/users/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404


class TestUserUpdate:
    def test_admin_kullanıcı_adını_günceller(self, client, student_user, admin_token):
        """Admin kullanıcının adını güncelleyebilir → 200."""
        resp = client.patch(
            f"/api/v1/users/{student_user.id}",
            json={"first_name": "Yeni"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Yeni"

    def test_admin_son_adminın_rolünü_değiştiremez(self, client, admin_user, admin_token):
        """Son admin'in rolü değiştirilemez → 400."""
        resp = client.patch(
            f"/api/v1/users/{admin_user.id}",
            json={"role": "student"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Kendi rolü veya son admin kısıtı
        assert resp.status_code in (400, 403)

    def test_student_başkasını_güncelleyemez(self, client, teacher_user, student_token):
        """Student başka kullanıcıyı güncelleyemez → 403."""
        resp = client.patch(
            f"/api/v1/users/{teacher_user.id}",
            json={"first_name": "Hack"},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403


class TestUserDelete:
    def test_admin_kullanıcı_siler(self, client, student_user, admin_token):
        """Admin kullanıcıyı soft delete ile siler → 200."""
        resp = client.delete(
            f"/api/v1/users/{student_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200

    def test_admin_kendini_silemez(self, client, admin_user, admin_token):
        """Admin kendi hesabını silemez → 403."""
        resp = client.delete(
            f"/api/v1/users/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 403

    def test_student_kullanıcı_silemez(self, client, teacher_user, student_token):
        """Student silme yetkisi yoktur → 403."""
        resp = client.delete(
            f"/api/v1/users/{teacher_user.id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403
