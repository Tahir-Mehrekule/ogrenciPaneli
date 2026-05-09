"""
Auth Integration Testleri

Gerçek endpoint'lere HTTP isteği atarak uçtan uca auth akışını test eder.
PostgreSQL test DB kullanır (conftest.py'dan).
"""

import pytest


class TestRegister:
    def test_öğretmen_kayıt_token_alır(self, client):
        """@ogr. içermeyen email ile kayıt → TEACHER, 201 + token."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "yeni@uni.edu.tr",
            "password": "Test1234!",
            "first_name": "Yeni",
            "last_name": "Öğretmen",
            "role": "teacher",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["access_token"] is not None
        assert data["refresh_token"] is not None

    def test_öğrenci_kayıt_pending_döner(self, client):
        """@ogr. email ile kayıt → STUDENT, 201 + PENDING (token yok)."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "yeni@ogr.uni.edu.tr",
            "password": "Test1234!",
            "first_name": "Yeni",
            "last_name": "Öğrenci",
            "role": "student",
            "student_no": "123456789",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["approval_status"] == "pending"
        assert data.get("access_token") is None

    def test_tekrar_aynı_email(self, client, student_user):
        """Aynı email ile ikinci kayıt → 409 Conflict."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "student@ogr.uni.edu.tr",
            "password": "Test1234!",
            "first_name": "Başka",
            "last_name": "Kullanıcı",
            "role": "student",
            "student_no": "987654321",
        })
        assert resp.status_code == 409

    def test_geçersiz_email(self, client):
        """Okul dışı email → 400 Bad Request."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "kisi@gmail.com",
            "password": "Test1234!",
            "first_name": "Gmail",
            "last_name": "Kullanıcı",
            "role": "teacher",
        })
        assert resp.status_code == 400

    def test_kısa_şifre(self, client):
        """6 karakterden kısa şifre → 422 Validation Error."""
        resp = client.post("/api/v1/auth/register", json={
            "email": "kisa@uni.edu.tr",
            "password": "abc",
            "first_name": "Kısa",
            "last_name": "Şifre",
            "role": "teacher",
        })
        assert resp.status_code == 422


class TestLogin:
    def test_başarılı_giriş(self, client, student_user):
        """Doğru bilgilerle giriş → 200 + token."""
        resp = client.post("/api/v1/auth/login", json={
            "email": "student@ogr.uni.edu.tr",
            "password": "Test1234!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_yanlış_şifre(self, client, student_user):
        """Yanlış şifre → 401 Unauthorized."""
        resp = client.post("/api/v1/auth/login", json={
            "email": "student@ogr.uni.edu.tr",
            "password": "YanlisŞifre!",
        })
        assert resp.status_code == 401

    def test_olmayan_kullanıcı(self, client):
        """Kayıtsız email ile giriş → 401."""
        resp = client.post("/api/v1/auth/login", json={
            "email": "yok@uni.edu.tr",
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
        assert resp.json()["email"] == "student@ogr.uni.edu.tr"

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
