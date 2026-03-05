"""
Report manager (yardımcı işlemler) modülü.

Haftalık rapor kuralları ve validasyon mantığını yönetir.
"""

from datetime import datetime

from app.common.enums import ReportStatus
from app.common.exceptions import ConflictException, ForbiddenException, BadRequestException
from app.common.validators import validate_youtube_url
from app.features.report.report_model import Report


def get_current_week_and_year() -> tuple[int, int]:
    """
    Mevcut ISO hafta numarasını ve yılı döner.
    datetime.isocalendar() kullanır.

    Returns:
        tuple[int, int]: (hafta_numarası, yıl)
    """
    today = datetime.now()
    iso = today.isocalendar()
    return iso.week, iso.year


def validate_weekly_uniqueness(
    project_id, user_id, week_number: int, year: int, repo
) -> None:
    """
    Aynı hafta için aynı kullanıcı-proje kombinasyonunda rapor olup olmadığını kontrol eder.

    Args:
        project_id: Proje UUID'si
        user_id: Kullanıcı UUID'si
        week_number: Hafta numarası
        year: Yıl
        repo: ReportRepo instance'ı

    Raises:
        ConflictException: Bu hafta için rapor zaten mevcutsa
    """
    existing = repo.get_by_week(project_id, user_id, week_number, year)
    if existing is not None:
        raise ConflictException(
            f"{year} yılının {week_number}. haftası için rapor zaten mevcut"
        )


def validate_report_editable(report: Report) -> None:
    """
    Raporun düzenlenebilir (DRAFT) durumda olup olmadığını kontrol eder.

    Args:
        report: Kontrol edilecek rapor

    Raises:
        ForbiddenException: Rapor DRAFT değilse
    """
    if report.status != ReportStatus.DRAFT:
        raise ForbiddenException(
            f"Sadece DRAFT raporlar düzenlenebilir. Mevcut durum: {report.status.value}"
        )


def validate_report_submittable(report: Report) -> None:
    """
    Raporun teslim edilebilir (DRAFT) durumda olup olmadığını kontrol eder.

    Raises:
        BadRequestException: Rapor DRAFT değilse
    """
    if report.status != ReportStatus.DRAFT:
        raise BadRequestException(
            f"Sadece DRAFT raporlar teslim edilebilir. Mevcut durum: {report.status.value}"
        )


def validate_report_owner(report: Report, user) -> None:
    """
    Kullanıcının raporun sahibi olup olmadığını kontrol eder.

    Raises:
        ForbiddenException: Kullanıcı raporun sahibi değilse
    """
    if str(report.submitted_by) != str(user.id):
        raise ForbiddenException("Bu rapor üzerinde işlem yapmaya yetkiniz yok")
