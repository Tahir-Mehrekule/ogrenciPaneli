"""
Admin Dashboard Modülü Entegrasyon Testleri
"""

import pytest

def test_admin_can_fetch_system_stats(client, admin_token, student_user, teacher_user, db):
    """
    Admin yetkilisine sahip kullanıcı sistem istatistiklerini başarılı bir şekilde alabilmelidir.
    """
    # Sisteme veri ekleme işlemleri (student ve teacher conftest'ten otomatik ekleniyor)
    from app.features.course.course_model import Course
    from app.features.project.project_model import Project
    from app.common.enums import ProjectStatus

    # Bir tane course ekleyelim
    course = Course(
        name="Admin Test DB Kursu",
        code="ADMIN101",
        semester="2026-Bahar",
        teacher_id=teacher_user.id
    )
    db.add(course)
    db.commit()

    # Bir tane proje ekleyelim
    project = Project(
        title="Admin Test Projesi",
        description="İstatistik projesi",
        course_id=course.id,
        status=ProjectStatus.APPROVED,
        created_by=student_user.id
    )
    db.add(project)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # İstatistik API isteği at
    resp = client.get("/api/v1/admin/stats", headers=headers)
    assert resp.status_code == 200
    
    data = resp.json()
    assert "total_users" in data
    assert "total_projects" in data
    assert "total_courses" in data
    
    # DB'de en az bunlar bulunmalı (student, teacher, admin vs dahil)
    assert data["total_users"] >= 3
    assert data["total_projects"] >= 1
    assert data["total_courses"] >= 1

def test_student_cannot_fetch_system_stats(client, student_token):
    """
    Öğrenci rolündeki bir kullanıcı sistem istatistiklerini görüntüleyememelidir (403 Forbidden).
    """
    headers = {"Authorization": f"Bearer {student_token}"}
    
    resp = client.get("/api/v1/admin/stats", headers=headers)
    assert resp.status_code == 403
    assert "yetki" in resp.json()["detail"].lower() or "forbidden" in resp.json()["detail"].lower()

def test_teacher_cannot_fetch_system_stats(client, teacher_token):
    """
    Öğretmen rolündeki bir kullanıcı sistem istatistiklerini görüntüleyememelidir (403 Forbidden).
    (Bu endpoint sadece ADMIN içindir).
    """
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    resp = client.get("/api/v1/admin/stats", headers=headers)
    assert resp.status_code == 403
    assert "yetki" in resp.json()["detail"].lower() or "forbidden" in resp.json()["detail"].lower()
