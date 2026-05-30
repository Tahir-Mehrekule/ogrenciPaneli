"""
Project Integration Testleri

Gerçek API endpoint'lerine HTTP istekleri atarak proje yönetimi akışını test eder.
PostgreSQL test DB kullanır (conftest.py'dan).
"""

import pytest


class TestProjectCreate:
    def test_student_proje_oluşturabilir(self, client, student_token, course):
        """Öğrenci proje oluşturabilir → 201."""
        resp = client.post(
            "/api/v1/projects",
            json={
                "title": "Test Proje",
                "description": "Bu bir test projesidir, açıklama zorunludur.",
                "course_id": str(course.id),
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == "Test Proje"
        assert resp.json()["status"] == "draft"

    def test_ders_olmadan_proje_oluşturulamaz(self, client, student_token):
        """course_id zorunlu — gönderilmezse → 422."""
        resp = client.post(
            "/api/v1/projects",
            json={"title": "Dersiz Proje", "description": "Ders seçilmeden proje açılamaz testi."},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 422

    def test_token_olmadan_proje_oluşturulamaz(self, client):
        """Token olmadan proje → 401."""
        resp = client.post(
            "/api/v1/projects",
            json={
                "title": "Proje",
                "description": "Bu açıklama yeterince uzundur.",
                "course_id": "00000000-0000-0000-0000-000000000000",
            },
        )
        assert resp.status_code == 401


class TestProjectList:
    def test_student_sadece_kendi_projelerini_görür(self, client, student_token, teacher_token, course):
        """STUDENT sadece kendi oluşturduğu projeleri listeler."""
        # Student proje oluştur
        client.post(
            "/api/v1/projects",
            json={"title": "Benim Projem", "description": "Bu benim özel proje açıklamam buradadır.", "course_id": str(course.id)},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        # Teacher farklı proje oluştur
        client.post(
            "/api/v1/projects",
            json={"title": "Öğretmen Projesi", "description": "Bu öğretmenin kendi projesidir açıklama.", "course_id": str(course.id)},
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

    def test_teacher_kendi_ders_projelerini_görür(
        self, client, admin_token, teacher_token, teacher_user, student_token, department,
    ):
        """TEACHER kendi dersine ait, DRAFT olmayan projeleri listeler.

        Not: Öğretmen yalnızca sahip olduğu derslerin projelerini görür ve
        DRAFT projeler staff'tan gizlidir. Bu yüzden proje bir derse bağlanıp
        onaya gönderilir (PENDING).
        """
        # Admin, teacher'a atanmış bir ders açar
        course_resp = client.post(
            "/api/v1/courses",
            json={
                "name": "Veri Yapıları",
                "code": "CENG201",
                "semester": "2026-Bahar",
                "department_id": str(department.id),
                "teacher_id": str(teacher_user.id),
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert course_resp.status_code == 201, f"Ders oluşturulamadı: {course_resp.json()}"
        course_id = course_resp.json()["id"]

        # Öğrenci bu derse bağlı proje oluşturur
        create_resp = client.post(
            "/api/v1/projects",
            json={
                "title": "Öğrenci Projesi",
                "description": "Bu öğrencinin test projesi açıklamasıdır.",
                "course_id": course_id,
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert create_resp.status_code == 201, f"Proje oluşturulamadı: {create_resp.json()}"
        project_id = create_resp.json()["id"]

        # DRAFT staff'tan gizli → onaya gönder (PENDING)
        submit_resp = client.post(
            f"/api/v1/projects/{project_id}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert submit_resp.status_code == 200

        # Öğretmen kendi dersinin projesini görmeli
        resp = client.get(
            "/api/v1/projects",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
        assert any(p["id"] == project_id for p in resp.json()["items"])


class TestProjectStatusFlow:
    def test_submit_pending_yap(self, client, student_token, course):
        """Proje PENDING'e alınır."""
        create = client.post(
            "/api/v1/projects",
            json={"title": "Onaya Gönderilecek", "description": "Bu projeyi onaya göndereceğiz test için.", "course_id": str(course.id)},
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

    def test_approve_teacher_yapabilir(self, client, student_token, teacher_token, course):
        """Öğretmen PENDING projeyi onaylar → APPROVED."""
        create = client.post(
            "/api/v1/projects",
            json={"title": "Onaylanacak Proje", "description": "Bu proje öğretmen tarafından onaylanacaktır.", "course_id": str(course.id)},
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

    def test_student_onaylayamaz(self, client, student_token, course):
        """Öğrenci projeyi approve edemez → 403."""
        create = client.post(
            "/api/v1/projects",
            json={"title": "Onay Testi", "description": "Bu projeyi öğrenci onaylamaya çalışacaktır.", "course_id": str(course.id)},
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
