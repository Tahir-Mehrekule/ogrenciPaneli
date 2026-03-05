"""
Enum (sabit değer) tanımları.

Projede kullanılan tüm sabit değerler burada tanımlanır.
Hardcoded string kullanmak yerine bu enum'lar kullanılır.
"""

import enum


class UserRole(str, enum.Enum):
    """
    Kullanıcı rolleri.
    - STUDENT: Öğrenci (@ogr. içeren mail ile otomatik atanır)
    - TEACHER: Öğretmen (admin tarafından manuel atanır)
    - ADMIN: Yönetici (admin tarafından manuel atanır)
    """
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class ProjectStatus(str, enum.Enum):
    """
    Proje durumları ve akışı:
    DRAFT → PENDING → APPROVED / REJECTED → IN_PROGRESS → COMPLETED

    - DRAFT: Taslak (henüz onaya gönderilmedi)
    - PENDING: Onay bekliyor (öğretmene gönderildi)
    - APPROVED: Onaylandı
    - REJECTED: Reddedildi
    - IN_PROGRESS: Devam ediyor (görevler atanmış)
    - COMPLETED: Tamamlandı
    """
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskStatus(str, enum.Enum):
    """
    Görev durumları:
    TODO → IN_PROGRESS → REVIEW → DONE

    - TODO: Yapılacak
    - IN_PROGRESS: Üzerinde çalışılıyor
    - REVIEW: İnceleme bekliyor
    - DONE: Tamamlandı
    """
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


class ReportStatus(str, enum.Enum):
    """
    Rapor durumları:
    DRAFT → SUBMITTED → REVIEWED

    - DRAFT: Taslak (henüz gönderilmedi)
    - SUBMITTED: Gönderildi (öğretmen incelemesi bekliyor)
    - REVIEWED: İncelendi (öğretmen geri bildirim verdi)
    """
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
