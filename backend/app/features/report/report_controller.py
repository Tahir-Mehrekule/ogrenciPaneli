"""
Report controller (API endpoint) modülü.

Haftalık rapor endpoint'lerini tanımlar.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, role_required
from app.common.enums import UserRole
from app.common.base_dto import PaginatedResponse
from app.features.report.report_service import ReportService
from app.features.report.report_dto import (
    ReportCreate, ReportUpdate, ReviewRequest, ReportResponse, ReportFilterParams,
)


router = APIRouter(
    prefix="/api/v1/reports",
    tags=["Reports"],
)


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Haftalık rapor oluştur",
)
def create_report(
    data: ReportCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Haftalık rapor oluşturur. Hafta/yıl otomatik hesaplanır."""
    return ReportService(db).create_report(data, current_user)


@router.get(
    "",
    response_model=PaginatedResponse,
    summary="Rapor listesi",
)
def list_reports(
    params: ReportFilterParams = Depends(),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Filtreli rapor listesi. STUDENT sadece kendi raporlarını görür."""
    return ReportService(db).list_reports(params, current_user)


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Rapor detayı",
)
def get_report(
    report_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rapor detayı."""
    return ReportService(db).get_report(report_id, current_user)


@router.patch(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Rapor güncelleme",
)
def update_report(
    report_id: UUID,
    data: ReportUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Raporu günceller. Sadece DRAFT raporlar ve sahip güncelleyebilir."""
    return ReportService(db).update_report(report_id, data, current_user)


@router.post(
    "/{report_id}/submit",
    response_model=ReportResponse,
    summary="Raporu teslim et",
)
def submit_report(
    report_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Raporu teslim eder: DRAFT → SUBMITTED."""
    return ReportService(db).submit_report(report_id, current_user)


@router.post(
    "/{report_id}/review",
    response_model=ReportResponse,
    summary="Raporu incele",
)
def review_report(
    report_id: UUID,
    data: ReviewRequest,
    current_user=Depends(role_required([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Raporu inceler ve geri bildirim ekler. Sadece TEACHER/ADMIN."""
    return ReportService(db).review_report(report_id, data, current_user)
