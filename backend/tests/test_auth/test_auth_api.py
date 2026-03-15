"""
Auth Integration Testleri

Gerçek endpoint'lere HTTP isteği atarak uçtan uca auth akışını test eder.
SQLite in-memory DB kullanır (conftest.py'dan).
"""

import pytest


class TestRegister:
    def test_başarılı_kayıt(self, client):
        """Geçerli bilgilerle kayıt → 201 + token döner."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "yeni@stu.edu.tr",
            "password": "Test1234!",
            "name": "Yeni Kullanıcı",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_tekrar_aynı_email(self, client, student_user):
        """Aynı email ile ikinci kayıt → 409 Conflict."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "student@stu.edu.tr",
            "password": "Test1234!",
            "name": "Başka Kullanıcı",
        })
        assert resp.status_code == 409

    def test_geçersiz_email(self, client):
        """Okul dışı email → 400 Bad Request."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "kisi@gmail.com",
            "password": "Test1234!",
            "name": "Gmail Kullanıcı",
        })
        assert resp.status_code == 400

    def test_kısa_şifre(self, client):
        """8 karakterden kısa şifre → 422 Validation Error."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "kisa@stu.edu.tr",
            "password": "abc",
            "name": "Kısa Şifre",
        })
        assert resp.status_code in (400, 422)


class TestLogin:
    def test_başarılı_giriş(self, client, student_user):
        """Doğru bilgilerle giriş → 200 + token."""
        resp = client.post("/api/v1/auth/login", json={
            "email": "student@stu.edu.tr",
            "password": "Test1234!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_yanlış_şifre(self, client, student_user):
        """Yanlış şifre → 401 Unauthorized."""
        resp = client.post("/api/v1/auth/login", json={
            "email": "student@stu.edu.tr",
            "password": "YanlisŞifre!",
        })
        assert resp.status_code == 401

    def test_olmayan_kullanıcı(self, client):
        """Kayıtsız email ile giriş → 401 (security: kullanıcı varlığı ifşa edilmez)."""
        resp = client.post("/api/v1/auth/login", json={
            "email": "yok@stu.edu.tr",
            "password": "Test1234!",
        })
        assert resp.status_code == 401



class TestMe:
    def test_geçerli_token_ile_profil(self, client, student_token):
        """Geçerli token ile /me → 200 + kullanıcı bilgisi."""
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "student@stu.edu.tr"

    def test_token_olmadan(self, client):
        """Token olmadan /me → 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_geçersiz_token(self, client):
        """Sahte token ile /me → 401."""
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer sahte.token.burada"},
        )
        assert resp.status_code == 401
