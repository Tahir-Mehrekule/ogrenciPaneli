"""
Course Enrollment (Derse Kayıt) Modülü Entegrasyon Testleri
"""

import pytest

@pytest.fixture
def a_course(client, teacher_token):
    """Testlerde kullanmak üzere hazır bir ders oluşturur."""
    headers = {"Authorization": f"Bearer {teacher_token}"}
    resp = client.post(
        "/api/v1/courses",
        json={"name": "Biyokimya", "code": "BIO301", "semester": "Güz"},
        headers=headers
    )
    return resp.json()["id"]

def test_student_can_enroll_to_course(client, student_token, a_course):
    """Öğrenci bir derse başarıyla kaydolabilmeli."""
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # Kaydol
    resp = client.post(f"/api/v1/courses/{a_course}/enroll", headers=headers)
    assert resp.status_code == 201

def test_student_cannot_enroll_twice(client, student_token, a_course):
    """Öğrenci aynı derse iki kez kaydolamamalı."""
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # 1. Kayıt
    client.post(f"/api/v1/courses/{a_course}/enroll", headers=headers)
    
    # 2. Kayıt (Hata vermeli)
    resp2 = client.post(f"/api/v1/courses/{a_course}/enroll", headers=headers)
    assert resp2.status_code == 409

def test_student_can_unenroll(client, student_token, a_course):
    """Öğrenci kayıtlı olduğu dersten kaydını silebilmeli."""
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # Önce kaydol
    client.post(f"/api/v1/courses/{a_course}/enroll", headers=headers)
    
    # Sonra ayrıl
    unenroll_resp = client.delete(f"/api/v1/courses/{a_course}/unenroll", headers=headers)
    assert unenroll_resp.status_code == 200
    assert "çıkıldı" in unenroll_resp.json()["message"].lower()

def test_teacher_cannot_enroll(client, teacher_token, a_course):
    """Öğretmen, öğrenci gibi derse kaydolamamalı (Mantıksal sınır veya Role kontrolü)."""
    headers = {"Authorization": f"Bearer {teacher_token}"}
    resp = client.post(f"/api/v1/courses/{a_course}/enroll", headers=headers)
    assert resp.status_code in [400, 403]

def test_list_enrolled_students(client, teacher_token, student_token, a_course):
    """Öğretmen dersine kayıtlı öğrencileri görebilmeli."""
    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    s_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Öğrenci kaydolur
    client.post(f"/api/v1/courses/{a_course}/enroll", headers=s_headers)
    
    # Öğretmen listeler
    list_resp = client.get(f"/api/v1/courses/{a_course}/students", headers=t_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1
    assert list_resp.json()[0]["email"] == "student@stu.edu.tr"
