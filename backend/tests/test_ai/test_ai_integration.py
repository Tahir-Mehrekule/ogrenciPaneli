"""
AI Modülü Entegrasyon Testleri (Faz 2)
"""

import pytest
import json

def test_analyze_report(client, teacher_token, teacher_user, student_user, db, mocker):
    """
    Öğretmen, bir öğrenciye ait raporu analiz etmek istediğinde, AI API'si mock'lanarak
    doğru yanıtın başarıyla parse edilip edilmediği test edilir.
    """
    from app.features.project.project_model import Project
    from app.features.report.report_model import Report
    from app.common.enums import ProjectStatus, ReportStatus

    # DB'ye gerekli mock verilerini ekle
    project = Project(
        title="Web",
        description="Okul projesi",
        created_by=student_user.id,
        status=ProjectStatus.APPROVED
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    report = Report(
        project_id=project.id,
        submitted_by=student_user.id,
        week_number=2,
        year=2026,
        content="Bu hafta login sayfasını yaptım ama veritabanı bağlantısı sıkıntılı.",
        status=ReportStatus.SUBMITTED
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Servis fonksiyonunu Mockla
    fake_parsed_response = {
        "summary": "İyi gidiyor.",
        "strengths": ["Login sayfasının yapılması", "Düzenli ilerleme"],
        "weaknesses": ["Veritabanı bağlantısındaki sıkıntılar"],
        "recommendations": ["SQLAlchemy dökümanlarını oku", "Hata loglarını kontrol et"]
    }

    mock_service = mocker.patch("app.features.ai.ai_manager.call_openrouter_for_report")
    mock_service.return_value = fake_parsed_response

    # Öğretmen olarak API'ye istek at
    headers = {"Authorization": f"Bearer {teacher_token}"}
    payload = {
        "report_id": str(report.id),
        "additional_context": "Veritabanı MongoDB olacak."
    }
    
    resp = client.post("/api/v1/ai/analyze-report", json=payload, headers=headers)
    assert resp.status_code == 200
    
    data = resp.json()
    assert data["summary"] == "İyi gidiyor."
    assert len(data["strengths"]) == 2
    assert "Login sayfasının yapılması" in data["strengths"]

def test_student_cannot_analyze_report(client, student_token, student_user, teacher_user, db):
    """
    Öğrenci, rapor analiz uc noktasını kullanamamalı (Sadece TEACHER / ADMIN)
    """
    from app.features.project.project_model import Project
    from app.features.report.report_model import Report
    from app.common.enums import ProjectStatus, ReportStatus

    # Başkasına ait (örneğin öğretmenin oluşturduğu) bir rapor/proje
    project = Project(title="Web", description="...", created_by=teacher_user.id, status=ProjectStatus.APPROVED)
    db.add(project)
    db.commit()

    report = Report(project_id=project.id, submitted_by=teacher_user.id, week_number=3, year=2026, content="X", status=ReportStatus.SUBMITTED)
    db.add(report)
    db.commit()
    db.refresh(report)

    headers = {"Authorization": f"Bearer {student_token}"}
    payload = {"report_id": str(report.id)}
    
    resp = client.post("/api/v1/ai/analyze-report", json=payload, headers=headers)
    assert resp.status_code == 403
