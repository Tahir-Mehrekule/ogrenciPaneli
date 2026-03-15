"""
Report Integration Testleri

Rapor oluşturma, teslim ve inceleme endpoint akışlarını test eder.
"""

import pytest


def _create_approved_project(client, student_token, teacher_token):
    """Yardımcı: APPROVED durumda proje oluşturur."""
    create = client.post(
        "/api/v1/projects",
        json={"title": "Rapor Projesi", "description": "Test açıklama."},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    pid = create.json()["id"]
    client.post(f"/api/v1/projects/{pid}/submit",
                headers={"Authorization": f"Bearer {student_token}"})
    client.post(f"/api/v1/projects/{pid}/approve",
                headers={"Authorization": f"Bearer {teacher_token}"})
    return pid


class TestReportCreate:
    def test_rapor_oluşturulur(self, client, student_token, teacher_token, student_user):
        """Öğrenci rapor oluşturabilir → 201."""
        pid = _create_approved_project(client, student_token, teacher_token)
        resp = client.post(
            "/api/v1/reports",
            json={"project_id": pid, "content": "Bu haftaki çalışmalarımı özetliyorum."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "draft"
        assert resp.json()["week_number"] is not None

    def test_aynı_haftada_ikinci_rapor_reddedilir(self, client, student_token, teacher_token):
        """Aynı haftada ikinci rapor → 409 Conflict."""
        pid = _create_approved_project(client, student_token, teacher_token)
        client.post(
            "/api/v1/reports",
            json={"project_id": pid, "content": "Birinci rapor içeriği burada."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        resp = client.post(
            "/api/v1/reports",
            json={"project_id": pid, "content": "İkinci rapor bu haftanın raporu."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 409


class TestReportSubmit:
    def test_rapor_teslim_edilir(self, client, student_token, teacher_token):
        """Rapor SUBMITTED durumuna geçer."""
        pid = _create_approved_project(client, student_token, teacher_token)
        rapor = client.post(
            "/api/v1/reports",
            json={"project_id": pid, "content": "Rapor içeriği detaylıdır."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        rid = rapor.json()["id"]

        resp = client.post(
            f"/api/v1/reports/{rid}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"


class TestReportReview:
    def test_teacher_raporu_inceler(self, client, student_token, teacher_token):
        """Öğretmen raporu REVIEWED yapar ve not ekler."""
        pid = _create_approved_project(client, student_token, teacher_token)
        rapor = client.post(
            "/api/v1/reports",
            json={"project_id": pid, "content": "Haftalık ilerleme raporu içeriği."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        rid = rapor.json()["id"]
        client.post(f"/api/v1/reports/{rid}/submit",
                    headers={"Authorization": f"Bearer {student_token}"})

        resp = client.post(
            f"/api/v1/reports/{rid}/review",
            json={"reviewer_note": "Güzel ilerleme, devam et."},
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "reviewed"
        assert resp.json()["reviewer_note"] == "Güzel ilerleme, devam et."

    def test_student_rapor_inceleyemez(self, client, student_token, teacher_token):
        """Öğrenci review yapamaz → 403."""
        pid = _create_approved_project(client, student_token, teacher_token)
        rapor = client.post(
            "/api/v1/reports",
            json={"project_id": pid, "content": "Rapor içeriği bu haftanın çalışmaları."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        rid = rapor.json()["id"]
        client.post(f"/api/v1/reports/{rid}/submit",
                    headers={"Authorization": f"Bearer {student_token}"})

        resp = client.post(
            f"/api/v1/reports/{rid}/review",
            json={"reviewer_note": "İnceleme notu."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403
