"""
Dosya Yükleme (File Upload) Modülü Entegrasyon Testleri
"""

import pytest

@pytest.fixture
def a_report(client, student_token, student_user, db):
    """Testler için bir DRAFT rapor oluşturur."""
    from app.features.project.project_model import Project
    from app.features.report.report_model import Report
    from app.common.enums import ProjectStatus, ReportStatus

    project = Project(
        title="Test Proje",
        description="Açıklama",
        created_by=student_user.id,
        status=ProjectStatus.APPROVED
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    report = Report(
        project_id=project.id,
        submitted_by=student_user.id,
        week_number=1,
        year=2026,
        content="Bu bir test raporudur.",
        status=ReportStatus.DRAFT
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report.id


def test_student_can_upload_file_to_draft_report(client, student_token, a_report):
    """Öğrenci taslak halindeki rapora dosya yükleyebilmeli."""
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # multipart/form-data upload
    files = {"file": ("test.pdf", b"dummy content", "application/pdf")}
    
    resp = client.post(f"/api/v1/reports/{a_report}/files", headers=headers, files=files)
    assert resp.status_code == 200
    
    data = resp.json()
    assert data["original_name"] == "test.pdf"
    assert data["mime_type"] == "application/pdf"

def test_student_cannot_upload_file_to_submitted_report(client, student_token, student_user, db):
    """Öğrenci IN_REVIEW/SUBMITTED halindeki rapora dosya yükleyememeli."""
    from app.features.project.project_model import Project
    from app.features.report.report_model import Report
    from app.common.enums import ProjectStatus, ReportStatus

    project = Project(title="P2", description="X", created_by=student_user.id, status=ProjectStatus.APPROVED)
    db.add(project)
    db.commit()

    report = Report(project_id=project.id, submitted_by=student_user.id, week_number=1, year=2026, content="X", status=ReportStatus.SUBMITTED)
    db.add(report)
    db.commit()
    db.refresh(report)

    headers = {"Authorization": f"Bearer {student_token}"}
    files = {"file": ("test2.pdf", b"dummy", "application/pdf")}
    
    resp = client.post(f"/api/v1/reports/{report.id}/files", headers=headers, files=files)
    assert resp.status_code == 400
    assert "DRAFT" in resp.json()["detail"] or "taslak" in resp.json()["detail"].lower()

def test_student_can_list_report_files(client, student_token, a_report):
    """Bir rapora ait dosyalar listelenebilmeli ve indirme linkleri (download_url) üretilebilmeli."""
    headers = {"Authorization": f"Bearer {student_token}"}
    files = {"file": ("test.pdf", b"dummy content", "application/pdf")}
    client.post(f"/api/v1/reports/{a_report}/files", headers=headers, files=files)
    
    list_resp = client.get(f"/api/v1/reports/{a_report}/files", headers=headers)
    assert list_resp.status_code == 200
    
    data = list_resp.json()
    assert len(data) >= 1
    assert data[0]["original_name"] == "test.pdf"
    assert "download_url" in data[0]

def test_student_can_delete_file(client, student_token, a_report):
    """Öğrenci kendine ait taslak rapordaki bir dosyayı silebilmeli."""
    headers = {"Authorization": f"Bearer {student_token}"}
    files = {"file": ("del.pdf", b"test", "application/pdf")}
    upload_resp = client.post(f"/api/v1/reports/{a_report}/files", headers=headers, files=files)
    file_id = upload_resp.json()["id"]
    
    delete_resp = client.delete(f"/api/v1/files/{file_id}", headers=headers)
    assert delete_resp.status_code == 200
    assert "silindi" in delete_resp.json()["message"].lower()

def test_teacher_cannot_delete_student_file(client, student_token, teacher_token, a_report):
    """Öğretmen, öğrencinin yüklediği taslak dosyayı silememeli (sadece yetkili/sahibi)."""
    s_headers = {"Authorization": f"Bearer {student_token}"}
    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    
    files = {"file": ("secret.pdf", b"test", "application/pdf")}
    upload_resp = client.post(f"/api/v1/reports/{a_report}/files", headers=s_headers, files=files)
    file_id = upload_resp.json()["id"]
    
    # Öğretmen silmeye çalışıyor
    delete_resp = client.delete(f"/api/v1/files/{file_id}", headers=t_headers)
    assert delete_resp.status_code == 403
