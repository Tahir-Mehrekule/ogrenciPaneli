"""
APScheduler — UniTrack AI arka plan görevleri (Paket 4B).

Şu an tek görev: Her Pazartesi 09:00 (Europe/Istanbul) — incelenmemiş raporları
ders öğretmenlerine bildirir.

Duplicate-job riski:
  Uvicorn `--workers >1` ile çalıştırıldığında her worker scheduler başlatır
  → aynı bildirim birden fazla gönderilebilir.
  docker-compose.yml'de `--workers 1` (varsayılan reload-mode). Birden fazla
  worker kullanılacaksa scheduler'ı ayrı bir entrypoint'e taşı.

Hot-reload (WatchFiles) sırasında scheduler eski instance kapanıp yenisi başlar;
state DB'de tutulmaz — kayıp/duplicate yok çünkü iş cron tetiklemeli ve idempotent
değil; öğrenci her gün test edilince spam olmaması için "geçen Pazartesi'den beri
hangi öğretmenlere zaten bildirim atıldı" kontrolü _send_review_pending_notifications
içinde yapılır.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


# ─────────────── Job 1: Haftalık inceleme bekleyen raporlar ───────────────

def _send_review_pending_notifications() -> None:
    """
    SUBMITTED + teacher_reviewed_at IS NULL olan raporları öğretmen bazında grupla;
    her öğretmene tek bir bildirim at.

    Bildirim 1 kez/hafta atılmalı: aynı öğretmen için son 6 günde
    REPORT_REVIEW_PENDING bildirimi varsa atlanır (re-run güvenliği).
    """
    from app.features.report.report_model import Report
    from app.features.project.project_model import Project
    from app.features.course.course_model import Course
    from app.features.auth.auth_model import User
    from app.features.notification.notification_model import Notification
    from app.common.enums import ReportStatus, NotificationType, UserRole
    from app.common.notification_helper import send_notification

    db = SessionLocal()
    try:
        # SUBMITTED raporlar, project → course → teacher zinciri ile öğretmenleri çek
        rows = (
            db.query(Course.teacher_id, Course.name, Report.id)
            .join(Project, Project.course_id == Course.id)
            .join(Report, Report.project_id == Project.id)
            .filter(Report.status == ReportStatus.SUBMITTED)
            .filter(Report.teacher_reviewed_at.is_(None))
            .filter(Report.is_deleted == False)
            .all()
        )

        # Öğretmen başına gruplama: { teacher_id: { course_names: set, count: int } }
        grouped: dict = {}
        for teacher_id, course_name, _report_id in rows:
            entry = grouped.setdefault(teacher_id, {"courses": set(), "count": 0})
            entry["courses"].add(course_name)
            entry["count"] += 1

        if not grouped:
            logger.info("[scheduler] No pending unreviewed reports — skipping.")
            return

        # Idempotency: son 6 günde aynı tipte bildirim atılmış öğretmenleri atla
        six_days_ago = datetime.now(timezone.utc) - timedelta(days=6)
        recently_notified = {
            row[0]
            for row in db.query(Notification.user_id)
            .filter(Notification.type == NotificationType.REPORT_REVIEW_PENDING)
            .filter(Notification.created_at >= six_days_ago)
            .distinct()
            .all()
        }

        sent_count = 0
        for teacher_id, info in grouped.items():
            if teacher_id in recently_notified:
                logger.info(f"[scheduler] Teacher {teacher_id} already notified within 6d — skip.")
                continue
            course_list = ", ".join(sorted(info["courses"])[:3])
            extra = "" if len(info["courses"]) <= 3 else f" ve {len(info['courses']) - 3} ders daha"
            message = (
                f"{info['count']} adet öğrenci raporu inceleme bekliyor "
                f"({course_list}{extra}). Lütfen kontrol edip geri bildirim verin."
            )
            try:
                send_notification(
                    db=db,
                    user_id=teacher_id,
                    type=NotificationType.REPORT_REVIEW_PENDING,
                    title="📋 İncelenmemiş Raporlar",
                    message=message,
                )
                sent_count += 1
            except Exception as e:
                logger.exception(f"[scheduler] Notification send failed for {teacher_id}: {e}")

        logger.info(f"[scheduler] Sent {sent_count} review-pending notifications.")
    finally:
        db.close()


# ─────────────── Scheduler yaşam döngüsü ───────────────

def start_scheduler() -> BackgroundScheduler:
    """FastAPI startup hook'ından çağrılır. Idempotent — çift çağrı sorun olmaz."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.info("[scheduler] Already running.")
        return _scheduler

    sched = BackgroundScheduler(timezone="Europe/Istanbul")
    # Her Pazartesi 09:00 — Europe/Istanbul
    sched.add_job(
        _send_review_pending_notifications,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="report_review_pending_weekly",
        replace_existing=True,
        misfire_grace_time=3600,  # 1 saat içinde başlatılırsa hala çalıştır
    )
    sched.start()
    _scheduler = sched
    logger.info("[scheduler] Started — REPORT_REVIEW_PENDING job armed for Mondays 09:00 (Europe/Istanbul).")
    return sched


def stop_scheduler() -> None:
    """FastAPI shutdown hook'ından çağrılır."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[scheduler] Stopped.")
    _scheduler = None


def trigger_review_pending_now() -> None:
    """Manuel tetikleme (debug/test için): aynı işi şimdi çalıştırır."""
    _send_review_pending_notifications()
