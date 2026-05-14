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

    def test_öğrenci_kayıt_token_alır(self, client):
        """@ogr. email ile kayıt → STUDENT, 201 + access+refresh token döner.

        Not: approval_status kolonu kaldırıldı (migration 66a68fb2ca31).
        Öğrenciler artık direkt token alır; ayrı onay akışı yok.
        """
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
        assert data["access_token"] is not None
        assert data["refresh_token"] is not None
        assert data["message"] == "Kayıt başarılı. Giriş yapabilirsiniz."

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


class TestRefresh:
    """T-1 — Refresh token endpoint testleri (G-5: token rotation + revocation)."""

    def test_geçerli_refresh_token_yeni_çift_döner(self, client, student_refresh_token):
        """Geçerli refresh token → 200 + yeni access + refresh token çifti."""
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": student_refresh_token,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] is not None
        assert data["refresh_token"] is not None
        # Yeni token eski token ile aynı olmamalı (rotation)
        assert data["refresh_token"] != student_refresh_token

    def test_aynı_refresh_token_iki_kez_kullanılamaz(self, client, student_refresh_token):
        """Kullanılmış refresh token → 401 Unauthorized (revocation kontrolü)."""
        # İlk kullanım başarılı
        resp1 = client.post("/api/v1/auth/refresh", json={"refresh_token": student_refresh_token})
        assert resp1.status_code == 200

        # İkinci kullanım → token revoke edilmiş
        resp2 = client.post("/api/v1/auth/refresh", json={"refresh_token": student_refresh_token})
        assert resp2.status_code == 401

    def test_access_token_ile_refresh_çağrısı_401(self, client, student_token):
        """Access token'ı refresh endpoint'ine göndermek → 401 (tip kontrolü)."""
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": student_token,
        })
        assert resp.status_code == 401

    def test_sahte_refresh_token_401(self, client):
        """Sahte / imzasız token → 401."""
        resp = client.post("/api/v1/auth/refresh", json={
            "refresh_token": "sahte.jwt.token",
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
