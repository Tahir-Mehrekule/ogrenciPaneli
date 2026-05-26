"""
Course Modülü Entegrasyon Testleri

Yetki kuralları (project.md ile tutarlı):
- Ders oluşturma: yalnızca ADMIN (öğretmen atanır)
- Ders düzenleme: ders sahibi öğretmen veya ADMIN
- Ders silme: TEACHER → soft delete (DB'de kalır), ADMIN → hard delete (kalıcı)
"""

import pytest

from app.features.course.course_model import Course
from app.features.user_department.user_department_model import UserDepartment


# `department` fixture conftest.py'da tanımlı (paylaşılan, DRY).


def _create_course(
    client, admin_token, department_id, teacher_id,
    code="CENG101", name="Yazılım Mühendisliği 101", semester="2025-2026 Güz",
):
    """ADMIN olarak ders oluşturur (yardımcı). Response döner."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": name,
        "code": code,
        "semester": semester,
        "department_id": str(department_id),
        "teacher_id": str(teacher_id),
    }
    return client.post("/api/v1/courses", json=payload, headers=headers)


# ── CREATE ──

def test_admin_can_create_course(client, admin_token, teacher_user, department):
    """ADMIN, öğretmen atayarak ders oluşturabilmeli; kod büyük harfe çevrilmeli."""
    resp = _create_course(
        client, admin_token, department.id, teacher_user.id,
        code="ceng101",
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Yazılım Mühendisliği 101"
    assert data["code"] == "CENG101"  # upper'a çevrilir
    assert data["teacher_id"] == str(teacher_user.id)
    assert "id" in data


def test_teacher_cannot_create_course(client, teacher_token, department):
    """Öğretmen ders oluşturamamalı — yalnızca ADMIN (role_required engeller)."""
    headers = {"Authorization": f"Bearer {teacher_token}"}
    payload = {
        "name": "Öğretmen Dersi",
        "code": "TCH1",
        "semester": "Bahar",
        "department_id": str(department.id),
    }
    resp = client.post("/api/v1/courses", json=payload, headers=headers)
    assert resp.status_code == 403


def test_student_cannot_create_course(client, student_token, department):
    """Öğrenci ders oluşturamamalı."""
    headers = {"Authorization": f"Bearer {student_token}"}
    payload = {
        "name": "Öğrenci Dersi",
        "code": "STU1",
        "semester": "Bahar",
        "department_id": str(department.id),
    }
    resp = client.post("/api/v1/courses", json=payload, headers=headers)
    assert resp.status_code == 403


def test_admin_cannot_create_duplicate_code(
    client, admin_token, teacher_user, department,
):
    """Aynı kodlu ders ikinci kez oluşturulamamalı (409)."""
    resp1 = _create_course(
        client, admin_token, department.id, teacher_user.id, code="DUP1",
    )
    assert resp1.status_code == 201

    resp2 = _create_course(
        client, admin_token, department.id, teacher_user.id, code="DUP1",
    )
    assert resp2.status_code == 409


def test_admin_create_requires_teacher(client, admin_token, department):
    """ADMIN teacher_id atamadan ders oluşturamamalı (400)."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": "Öğretmensiz Ders",
        "code": "NOTCH",
        "semester": "Bahar",
        "department_id": str(department.id),
    }
    resp = client.post("/api/v1/courses", json=payload, headers=headers)
    assert resp.status_code == 400


def test_admin_cannot_assign_non_teacher(
    client, admin_token, student_user, department,
):
    """ADMIN, TEACHER olmayan birini öğretmen olarak atayamamalı (400)."""
    resp = _create_course(
        client, admin_token, department.id, student_user.id, code="BADTCH",
    )
    assert resp.status_code == 400


# ── READ ──

def test_list_and_get_course(
    client, db, admin_token, teacher_user, student_user, student_token, department,
):
    """Ders listelenebilir ve detayı çekilebilir; öğrenci bölümüyle eşleşeni görür."""
    course_id = _create_course(
        client, admin_token, department.id, teacher_user.id, code="MAT102",
        name="Matematik 2",
    ).json()["id"]

    # Öğrenciyi bölüme bağla → bölüm eşleşmesiyle dersi görmeli
    db.add(UserDepartment(user_id=student_user.id, department_id=department.id))
    db.commit()

    s_headers = {"Authorization": f"Bearer {student_token}"}
    list_resp = client.get("/api/v1/courses", headers=s_headers)
    assert list_resp.status_code == 200
    assert any(c["code"] == "MAT102" for c in list_resp.json()["items"])

    get_resp = client.get(f"/api/v1/courses/{course_id}", headers=s_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["code"] == "MAT102"


# ── UPDATE ──

def test_teacher_can_update_own_course(
    client, admin_token, teacher_token, teacher_user, department,
):
    """Dersin sahibi öğretmen kendi dersini güncelleyebilmeli."""
    course_id = _create_course(
        client, admin_token, department.id, teacher_user.id, code="PHYS101",
        name="Fizik 1",
    ).json()["id"]

    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    resp = client.patch(
        f"/api/v1/courses/{course_id}",
        json={"name": "İleri Fizik 1"},
        headers=t_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "İleri Fizik 1"


def test_student_cannot_update_course(
    client, admin_token, teacher_user, student_token, department,
):
    """Öğrenci ders güncelleyememeli (403)."""
    course_id = _create_course(
        client, admin_token, department.id, teacher_user.id, code="UPD403",
    ).json()["id"]

    s_headers = {"Authorization": f"Bearer {student_token}"}
    resp = client.patch(
        f"/api/v1/courses/{course_id}",
        json={"name": "Olmaz"},
        headers=s_headers,
    )
    assert resp.status_code == 403


# ── DELETE ──

def test_teacher_delete_is_soft(
    client, db, admin_token, teacher_token, teacher_user, department,
):
    """Öğretmen kendi dersini silince SOFT delete olmalı: kayıt DB'de kalır
    (is_deleted=True) ama listeden düşer."""
    course_id = _create_course(
        client, admin_token, department.id, teacher_user.id, code="SOFT1",
    ).json()["id"]

    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    del_resp = client.delete(f"/api/v1/courses/{course_id}", headers=t_headers)
    assert del_resp.status_code == 200

    # DB'de hâlâ var, ama is_deleted=True
    row = db.query(Course).filter(Course.id == course_id).first()
    assert row is not None
    assert row.is_deleted is True

    # Listede görünmemeli
    list_resp = client.get("/api/v1/courses", headers=t_headers)
    assert all(c["id"] != course_id for c in list_resp.json()["items"])


def test_admin_delete_is_hard(
    client, db, admin_token, teacher_user, department,
):
    """ADMIN silince HARD delete olmalı: kayıt DB'den tamamen kaldırılır."""
    course_id = _create_course(
        client, admin_token, department.id, teacher_user.id, code="HARD1",
    ).json()["id"]

    a_headers = {"Authorization": f"Bearer {admin_token}"}
    del_resp = client.delete(f"/api/v1/courses/{course_id}", headers=a_headers)
    assert del_resp.status_code == 200

    # DB'de hiç kalmamalı
    row = db.query(Course).filter(Course.id == course_id).first()
    assert row is None


def test_student_cannot_delete_course(
    client, admin_token, teacher_user, student_token, department,
):
    """Öğrenci ders silememeli (403)."""
    course_id = _create_course(
        client, admin_token, department.id, teacher_user.id, code="DEL403",
    ).json()["id"]

    s_headers = {"Authorization": f"Bearer {student_token}"}
    resp = client.delete(f"/api/v1/courses/{course_id}", headers=s_headers)
    assert resp.status_code == 403
