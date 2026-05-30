"""
Project Member — Katılım İsteği (join-request) Entegrasyon Testleri

Kapsam:
- Ekip projesine katılım isteği → 201 + proje sahibine bildirim oluşur
- Bireysel projeye katılım isteği → 400 (üye kabul etmez)
"""

from app.features.auth.auth_model import User
from app.core.security import hash_password
from app.common.enums import UserRole


def _second_student(db):
    """İstek gönderecek ikinci öğrenciyi oluşturur."""
    user = User(
        email="joiner@ogr.uni.edu.tr",
        password_hash=hash_password("Test1234!"),
        first_name="Katılan",
        last_name="Öğrenci",
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    return resp.json()["access_token"]


def _create_project(client, token, course_id, project_type):
    resp = client.post(
        "/api/v1/projects",
        json={
            "title": "Katılım Test Projesi",
            "description": "Katılım isteği testleri için proje açıklaması.",
            "course_id": str(course_id),
            "project_type": project_type,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, f"Proje oluşturulamadı: {resp.json()}"
    return resp.json()["id"]


class TestJoinRequest:
    def test_ekip_projesine_katılım_isteği_sahibe_bildirim(
        self, client, db, student_user, student_token, course
    ):
        """Ekip projesine katılım isteği → 201 ve proje sahibine bildirim oluşur."""
        pid = _create_project(client, student_token, course.id, "team")

        joiner = _second_student(db)
        joiner_token = _login(client, joiner.email)

        resp = client.post(
            f"/api/v1/projects/{pid}/join-request",
            headers={"Authorization": f"Bearer {joiner_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "JOIN_REQUESTED"

        # Proje sahibine "Yeni Katılım İsteği" bildirimi düşmüş olmalı
        from app.features.notification.notification_model import Notification
        notif = (
            db.query(Notification)
            .filter(
                Notification.user_id == student_user.id,
                Notification.title == "Yeni Katılım İsteği",
            )
            .first()
        )
        assert notif is not None

    def test_bireysel_projeye_katılım_isteği_reddedilir(
        self, client, db, student_token, course
    ):
        """Bireysel projeye katılım isteği → 400 (ekip projesi değil)."""
        pid = _create_project(client, student_token, course.id, "individual")

        joiner = _second_student(db)
        joiner_token = _login(client, joiner.email)

        resp = client.post(
            f"/api/v1/projects/{pid}/join-request",
            headers={"Authorization": f"Bearer {joiner_token}"},
        )
        assert resp.status_code == 400
