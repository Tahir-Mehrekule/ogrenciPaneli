"""
Notification Modülü Entegrasyon Testleri
"""

import pytest

def test_student_can_fetch_notifications(client, student_token):
    """Öğrenci kendisine ait olan bildirimleri listeleyebilmeli."""
    headers = {"Authorization": f"Bearer {student_token}"}
    resp = client.get("/api/v1/notifications", headers=headers)
    
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data

def test_notification_creation_and_mark_read(client, student_token, student_user, db):
    """Bildirim oluşturulabilmeli ve 'okundu' olarak işaretlenebilmeli."""
    from app.features.notification.notification_model import Notification
    
    # Doğrudan DB seviyesinde test için bir bildirim ekleyelim
    notif = Notification(
        user_id=student_user.id,
        title="Test Bildirimi",
        message="Bu bir test mesajıdır",
        type="system_alert",
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # Listede okundu mu (is_read=False) kontrolü
    list_resp = client.get("/api/v1/notifications?unread_only=true", headers=headers)
    assert list_resp.status_code == 200
    assert any(n["id"] == str(notif.id) for n in list_resp.json()["items"])
    
    # Okundu olarak işaretle
    mark_resp = client.patch(f"/api/v1/notifications/{notif.id}/read", headers=headers)
    assert mark_resp.status_code == 200
    assert mark_resp.json()["is_read"] is True
    
    # Unread listesinde artık görünmemeli
    list_resp_2 = client.get("/api/v1/notifications?unread_only=true", headers=headers)
    assert not any(n["id"] == str(notif.id) for n in list_resp_2.json()["items"])

def test_mark_all_read(client, teacher_token, teacher_user, db):
    """Bir kullanıcıya ait tüm bildirimler 'okundu' olarak işaretlenebilmeli."""
    from app.features.notification.notification_model import Notification
    
    # Öğretmene 2 bildirim ekleyelim
    db.add_all([
        Notification(user_id=teacher_user.id, title="1", message="m1", type="system_alert"),
        Notification(user_id=teacher_user.id, title="2", message="m2", type="task_assigned")
    ])
    db.commit()

    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Hepsini okundu yap
    resp = client.patch("/api/v1/notifications/read-all", headers=headers)
    assert resp.status_code == 200
    assert "bildirim okundu" in resp.json()["message"].lower()

    # Okunmamış kalmamalı
    unread = client.get("/api/v1/notifications?unread_only=true", headers=headers).json()
    assert unread["total"] == 0

def test_user_cannot_read_others_notification(client, student_token, teacher_user, db):
    """Kullanıcı başkasına ait bir bildirimi 'okundu' yapamamalı."""
    from app.features.notification.notification_model import Notification
    
    # Öğretmene ait bir bildirim
    notif = Notification(user_id=teacher_user.id, title="Özel", message="x", type="system_alert")
    db.add(notif)
    db.commit()
    db.refresh(notif)

    headers = {"Authorization": f"Bearer {student_token}"}
    resp = client.patch(f"/api/v1/notifications/{notif.id}/read", headers=headers)
    
    # NotFound veya Forbidden dönmeli
    assert resp.status_code in [403, 404]
