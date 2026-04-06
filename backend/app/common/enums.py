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


class NotificationType(str, enum.Enum):
    """
    Bildirim tipleri:
    - PROJECT_APPROVED: Proje onaylandı
    - PROJECT_REJECTED: Proje reddedildi
    - TASK_ASSIGNED: Görev atandı
    - REPORT_REVIEWED: Rapor incelendi
    - SYSTEM_ALERT: Sistem duyurusu
    """
    PROJECT_APPROVED = "project_approved"
    PROJECT_REJECTED = "project_rejected"
    TASK_ASSIGNED = "task_assigned"
    REPORT_REVIEWED = "report_reviewed"
    SYSTEM_ALERT = "system_alert"


class ActivityAction(str, enum.Enum):
    """
    Sistem aktivite log aksiyonları.
    """
    USER_LOGIN = "user_login"
    USER_REGISTER = "user_register"
    USER_ROLE_CHANGE = "user_role_change"
    PROJECT_CREATE = "project_create"
    PROJECT_APPROVE = "project_approve"
    PROJECT_REJECT = "project_reject"
    REPORT_SUBMIT = "report_submit"
    REPORT_REVIEW = "report_review"
    COURSE_CREATE = "course_create"
    COURSE_UPDATE = "course_update"
    COURSE_DELETE = "course_delete"


class EntityType(str, enum.Enum):
    """
    Log kaydının ilgili olduğu varlık tipi.
    """
    USER = "user"
    PROJECT = "project"
    REPORT = "report"
    COURSE = "course"
    TASK = "task"
