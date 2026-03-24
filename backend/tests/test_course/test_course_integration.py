"""
Course Modülü Entegrasyon Testleri
"""

import pytest
from app.features.course.course_model import Course

def test_teacher_can_create_course(client, teacher_token):
    """Öğretmen yeni bir ders oluşturabilmeli."""
    headers = {"Authorization": f"Bearer {teacher_token}"}
    payload = {
        "name": "Yazılım Mühendisliği 101",
        "code": "CENG101",
        "semester": "Güz 2026"
    }

    response = client.post("/api/v1/courses", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Yazılım Mühendisliği 101"
    assert data["code"] == "CENG101"
    assert "id" in data

def test_teacher_cannot_create_duplicate_course_code(client, teacher_token):
    """Aynı kodlu ders ikinci kez oluşturulamamalı."""
    headers = {"Authorization": f"Bearer {teacher_token}"}
    payload = {"name": "Test Dersi", "code": "TEST1", "semester": "Bahar"}

    # İlk kayıt başarılı
    resp1 = client.post("/api/v1/courses", json=payload, headers=headers)
    assert resp1.status_code == 201

    # İkinci kayıt hata vermeli
    resp2 = client.post("/api/v1/courses", json=payload, headers=headers)
    assert resp2.status_code == 409

def test_student_cannot_create_course(client, student_token):
    """Öğrenci ders oluşturamamalı."""
    headers = {"Authorization": f"Bearer {student_token}"}
    payload = {"name": "Öğrenci Dersi", "code": "STU1", "semester": "Bahar"}

    response = client.post("/api/v1/courses", json=payload, headers=headers)
    assert response.status_code == 403 # role_required engeller

def test_list_and_get_course(client, teacher_token, student_token):
    """Dersler listelenebilir ve detayları çekilebilir olmalı."""
    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    s_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Öğretmen bir ders ekler
    course_resp = client.post(
        "/api/v1/courses",
        json={"name": "Matematik 2", "code": "MAT102", "semester": "Bahar"},
        headers=t_headers
    ).json()
    course_id = course_resp["id"]

    # Liste kontrolü (öğrenci görüntüleyebilmeli)
    list_resp = client.get("/api/v1/courses", headers=s_headers)
    assert list_resp.status_code == 200
    assert any(c["code"] == "MAT102" for c in list_resp.json()["items"])

    # Detay kontrolü (öğrenci görüntüleyebilmeli)
    get_resp = client.get(f"/api/v1/courses/{course_id}", headers=s_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["code"] == "MAT102"

def test_teacher_can_update_own_course(client, teacher_token):
    """Öğretmen sadece kendi dersini güncelleyebilmeli."""
    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    
    course_resp = client.post(
        "/api/v1/courses",
        json={"name": "Fizik 1", "code": "PHYS101", "semester": "Güz"},
        headers=t_headers
    ).json()
    course_id = course_resp["id"]

    # İsim güncellemesi
    update_resp = client.patch(
        f"/api/v1/courses/{course_id}",
        json={"name": "İleri Fizik 1"},
        headers=t_headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "İleri Fizik 1"

def test_student_cannot_delete_course(client, teacher_token, student_token):
    """Öğrenci bir dersi silememeli."""
    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    s_headers = {"Authorization": f"Bearer {student_token}"}
    
    course_resp = client.post(
        "/api/v1/courses",
        json={"name": "Kimya 1", "code": "CHEM101", "semester": "Güz"},
        headers=t_headers
    ).json()
    course_id = course_resp["id"]

    # Öğrenci silmeye çalışır
    delete_resp = client.delete(f"/api/v1/courses/{course_id}", headers=s_headers)
    assert delete_resp.status_code == 403
