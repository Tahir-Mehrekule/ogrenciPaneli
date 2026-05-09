"""
Task Integration Testleri

Görev oluşturma, listeleme, durum güncelleme endpoint akışlarını test eder.
PostgreSQL test DB kullanır (conftest.py'dan).
"""

import pytest
from app.features.auth.auth_model import User
from app.features.project.project_model import Project
from app.features.project_member.project_member_model import ProjectMember
from app.common.enums import UserRole, ProjectStatus
from app.core.security import hash_password


def _create_approved_project(client, student_token, teacher_token):
    """Yardımcı: APPROVED durumda proje oluşturur ve proje ID'sini döner."""
    create = client.post(
        "/api/v1/projects",
        json={"title": "Görev Test Projesi", "description": "Bu proje görev testleri için oluşturulmuştur."},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert create.status_code == 201, f"Proje oluşturulamadı: {create.json()}"
    pid = create.json()["id"]
    client.post(f"/api/v1/projects/{pid}/submit", headers={"Authorization": f"Bearer {student_token}"})
    client.post(f"/api/v1/projects/{pid}/approve", headers={"Authorization": f"Bearer {teacher_token}"})
    return pid


@pytest.fixture
def approved_project(client, student_token, teacher_token):
    """APPROVED durumda proje fixture'ı."""
    return _create_approved_project(client, student_token, teacher_token)


@pytest.fixture
def project_owner_and_task(client, db, student_user, student_token, teacher_token):
    """Proje sahibi olan öğrenci, APPROVED proje ve o projedeki bir görevi döner."""
    pid = _create_approved_project(client, student_token, teacher_token)

    # Proje sahibini üye olarak ekle
    member = ProjectMember(project_id=pid, user_id=student_user.id)
    db.add(member)
    db.commit()

    task_resp = client.post(
        "/api/v1/tasks",
        json={
            "title": "Hazır Görev",
            "description": "Bu görev testler için hazırlandı.",
            "project_id": str(pid),
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert task_resp.status_code == 201, f"Görev oluşturulamadı: {task_resp.json()}"
    return pid, task_resp.json()["id"]


class TestTaskCreate:
    def test_proje_sahibi_görev_oluşturabilir(self, client, db, student_user, student_token, teacher_token):
        """Proje sahibi görev oluşturabilir → 201."""
        pid = _create_approved_project(client, student_token, teacher_token)

        resp = client.post(
            "/api/v1/tasks",
            json={
                "title": "Test Görevi",
                "description": "Bu görevi test etmek için oluşturduk.",
                "project_id": str(pid),
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == "Test Görevi"
        assert resp.json()["status"] == "todo"

    def test_token_olmadan_görev_oluşturulamaz(self, client, approved_project):
        """Token olmadan görev oluşturma → 401."""
        resp = client.post(
            "/api/v1/tasks",
            json={
                "title": "Yetkisiz Görev",
                "description": "Token olmadan oluşturulmaya çalışılan görev.",
                "project_id": str(approved_project),
            },
        )
        assert resp.status_code == 401

    def test_atanan_kişi_proje_üyesi_değilse_hata(self, client, db, student_user, teacher_user, student_token, teacher_token):
        """Projede olmayan kişiye görev atanamaz → 400."""
        pid = _create_approved_project(client, student_token, teacher_token)

        resp = client.post(
            "/api/v1/tasks",
            json={
                "title": "Atama Hatası Görevi",
                "description": "Bu görev üye olmayan kişiye atanmaya çalışılıyor.",
                "project_id": str(pid),
                "assigned_to": str(teacher_user.id),
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 400


class TestTaskList:
    def test_teacher_tüm_görevleri_listeler(self, client, project_owner_and_task, teacher_token):
        """TEACHER tüm görevleri görür."""
        resp = client.get(
            "/api/v1/tasks",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_student_sadece_üyesi_olduğu_proje_görevlerini_görür(
        self, client, db, student_user, student_token, teacher_token
    ):
        """STUDENT sadece üyesi olduğu projelerdeki görevleri görür."""
        pid = _create_approved_project(client, student_token, teacher_token)

        # Öğrenciyi üye yap
        member = ProjectMember(project_id=pid, user_id=student_user.id)
        db.add(member)
        db.commit()

        # Görev oluştur
        client.post(
            "/api/v1/tasks",
            json={"title": "Üye Görevi", "description": "Üye olduğum projedeki görev.", "project_id": str(pid)},
            headers={"Authorization": f"Bearer {student_token}"},
        )

        resp = client.get(
            "/api/v1/tasks",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1


class TestTaskStatusUpdate:
    def test_student_todo_dan_in_progress_yapabilir(self, client, db, student_user, student_token, teacher_token):
        """Öğrenci TODO → IN_PROGRESS yapabilir."""
        pid = _create_approved_project(client, student_token, teacher_token)
        member = ProjectMember(project_id=pid, user_id=student_user.id)
        db.add(member)
        db.commit()

        task = client.post(
            "/api/v1/tasks",
            json={"title": "Durum Görevi", "description": "Durum geçişi test görevidir.", "project_id": str(pid)},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        tid = task.json()["id"]

        resp = client.patch(
            f"/api/v1/tasks/{tid}/status",
            json={"status": "in_progress"},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    def test_student_review_dan_done_yapamaz(self, client, db, student_user, student_token, teacher_token):
        """Öğrenci REVIEW → DONE yapamaz → 403."""
        pid = _create_approved_project(client, student_token, teacher_token)
        member = ProjectMember(project_id=pid, user_id=student_user.id)
        db.add(member)
        db.commit()

        task = client.post(
            "/api/v1/tasks",
            json={"title": "Review Görevi", "description": "REVIEW durumuna getireceğiz bu görevi.", "project_id": str(pid)},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        tid = task.json()["id"]

        # TODO → IN_PROGRESS → REVIEW
        client.patch(f"/api/v1/tasks/{tid}/status", json={"status": "in_progress"},
                     headers={"Authorization": f"Bearer {student_token}"})
        client.patch(f"/api/v1/tasks/{tid}/status", json={"status": "review"},
                     headers={"Authorization": f"Bearer {student_token}"})

        resp = client.patch(
            f"/api/v1/tasks/{tid}/status",
            json={"status": "done"},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403

    def test_teacher_review_dan_done_yapabilir(self, client, db, student_user, student_token, teacher_token):
        """Öğretmen REVIEW → DONE yapabilir."""
        pid = _create_approved_project(client, student_token, teacher_token)
        member = ProjectMember(project_id=pid, user_id=student_user.id)
        db.add(member)
        db.commit()

        task = client.post(
            "/api/v1/tasks",
            json={"title": "Teacher Done Görevi", "description": "Öğretmen tamamlayacak bu görevi.", "project_id": str(pid)},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        tid = task.json()["id"]

        client.patch(f"/api/v1/tasks/{tid}/status", json={"status": "in_progress"},
                     headers={"Authorization": f"Bearer {student_token}"})
        client.patch(f"/api/v1/tasks/{tid}/status", json={"status": "review"},
                     headers={"Authorization": f"Bearer {student_token}"})

        resp = client.patch(
            f"/api/v1/tasks/{tid}/status",
            json={"status": "done"},
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "done"


class TestTaskDelete:
    def test_proje_sahibi_görevi_silebilir(self, client, project_owner_and_task, student_token):
        """Proje sahibi görevi silebilir → 200."""
        _, tid = project_owner_and_task
        resp = client.delete(
            f"/api/v1/tasks/{tid}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200

    def test_yabancı_kullanıcı_silemez(self, client, db, project_owner_and_task, teacher_token):
        """Proje sahibi olmayan öğretmen görevi silemez → 403."""
        _, tid = project_owner_and_task

        # Farklı bir kullanıcı
        other = User(
            email="other@uni.edu.tr",
            password_hash=hash_password("Test1234!"),
            first_name="Başka",
            last_name="Kişi",
            role=UserRole.STUDENT,
        )
        db.add(other)
        db.commit()

        resp = client.delete(
            f"/api/v1/tasks/{tid}",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        # Teacher başkasının projesindeki görevi silemez
        assert resp.status_code == 403
