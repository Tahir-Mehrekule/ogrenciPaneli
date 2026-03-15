"""
Project Integration Testleri

Gerçek API endpoint'lerine HTTP istekleri atarak proje yönetimi akışını test eder.
PostgreSQL test DB kullanır (conftest.py'dan).
"""

import pytest


class TestProjectCreate:
    def test_student_proje_oluşturabilir(self, client, student_token):
        """Öğrenci proje oluşturabilir → 201."""
        resp = client.post(
            "/api/v1/projects",
            json={"title": "Test Proje", "description": "Bu bir test projesidir, açıklama zorunludur."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == "Test Proje"
        assert resp.json()["status"] == "draft"

    def test_token_olmadan_proje_oluşturulamaz(self, client):
        """Token olmadan proje → 401."""
        resp = client.post(
            "/api/v1/projects",
            json={"title": "Proje", "description": "Bu açıklama yeterince uzundur."},
        )
        assert resp.status_code == 401


class TestProjectList:
    def test_student_sadece_kendi_projelerini_görür(self, client, student_token, teacher_token):
        """STUDENT sadece kendi oluşturduğu projeleri listeler."""
        # Student proje oluştur
        client.post(
            "/api/v1/projects",
            json={"title": "Benim Projem", "description": "Bu benim özel proje açıklamam buradadır."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        # Teacher farklı proje oluştur
        client.post(
            "/api/v1/projects",
            json={"title": "Öğretmen Projesi", "description": "Bu öğretmenin kendi projesidir açıklama."},
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        # Student listesini kontrol et
        resp = client.get(
            "/api/v1/projects",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(p["title"] != "Öğretmen Projesi" for p in items)

    def test_teacher_tum_projeleri_görür(self, client, student_token, teacher_token):
        """TEACHER tüm projeleri listeler."""
        create_resp = client.post(
            "/api/v1/projects",
            json={"title": "Öğrenci Projesi", "description": "Bu öğrencinin test projesi açıklamasıdır."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert create_resp.status_code == 201, f"Proje oluşturulamadı: {create_resp.json()}"

        resp = client.get(
            "/api/v1/projects",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1


class TestProjectStatusFlow:
    def test_submit_pending_yap(self, client, student_token):
        """Proje PENDING'e alınır."""
        create = client.post(
            "/api/v1/projects",
            json={"title": "Onaya Gönderilecek", "description": "Bu projeyi onaya göndereceğiz test için."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert create.status_code == 201, f"Proje oluşturulamadı: {create.json()}"
        project_id = create.json()["id"]

        resp = client.post(
            f"/api/v1/projects/{project_id}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "pending"

    def test_approve_teacher_yapabilir(self, client, student_token, teacher_token):
        """Öğretmen PENDING projeyi onaylar → APPROVED."""
        create = client.post(
            "/api/v1/projects",
            json={"title": "Onaylanacak Proje", "description": "Bu proje öğretmen tarafından onaylanacaktır."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert create.status_code == 201, f"Proje oluşturulamadı: {create.json()}"
        project_id = create.json()["id"]

        client.post(
            f"/api/v1/projects/{project_id}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        resp = client.post(
            f"/api/v1/projects/{project_id}/approve",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_student_onaylayamaz(self, client, student_token):
        """Öğrenci projeyi approve edemez → 403."""
        create = client.post(
            "/api/v1/projects",
            json={"title": "Onay Testi", "description": "Bu projeyi öğrenci onaylamaya çalışacaktır."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert create.status_code == 201, f"Proje oluşturulamadı: {create.json()}"
        project_id = create.json()["id"]

        client.post(
            f"/api/v1/projects/{project_id}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        resp = client.post(
            f"/api/v1/projects/{project_id}/approve",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403
