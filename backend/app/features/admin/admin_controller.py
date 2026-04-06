"""
Admin Controller (API uç noktaları) modülü.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import role_required
from app.common.enums import UserRole
from app.features.admin.admin_service import AdminService
from app.features.admin.admin_dto import SystemStatsResponse, DetailedStatsResponse

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
)

@router.get(
    "/stats",
    response_model=SystemStatsResponse,
    summary="Sistem İstatistiklerini Getir",
    description="Sadece sistem yöneticileri görebilir. Sistemdeki toplam kullanıcı, proje, görev vb. metrikleri okur.",
)
def get_system_stats(
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Sistem istatistikleri.
    """
    return AdminService(db).get_system_stats()


@router.get(
    "/stats/detailed",
    response_model=DetailedStatsResponse,
    summary="Detaylı Sistem İstatistiklerini Getir",
    description="Kullanıcı rol dağılımı, proje/görev/rapor durum dağılımları, tamamlanma oranları ve ek sayıları döner. Sadece ADMIN.",
)
def get_detailed_stats(
    current_user=Depends(role_required([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Detaylı sistem istatistikleri — dağılımlar ve oranlar."""
    return AdminService(db).get_detailed_stats()
