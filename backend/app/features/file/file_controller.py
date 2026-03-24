"""
Dosya yükleme API uç noktaları (Controller).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.common.base_dto import MessageResponse
from app.features.file.file_service import FileService
from app.features.file.file_dto import FileUploadResponse


router = APIRouter(
    tags=["Files"],
)


@router.post(
    "/api/v1/reports/{report_id}/files",
    response_model=FileUploadResponse,
    summary="Rapora dosya ekle",
)
def upload_report_file(
    report_id: UUID,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Belirtilen rapora bir dosya yükler.
    Sadece DRAFT statüsündeki raporlara ve rapor sahibi tarafından yüklenebilir.
    """
    return FileService(db).upload_report_file(report_id, file, current_user)


@router.get(
    "/api/v1/reports/{report_id}/files",
    response_model=list[FileUploadResponse],
    summary="Rapor dosyalarını listele",
)
def list_report_files(
    report_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Belirli bir rapora ait tüm dosyaları metadataları ve geçici indirme linkleriyle getirir.
    """
    return FileService(db).list_report_files(report_id, current_user)


@router.delete(
    "/api/v1/files/{file_id}",
    response_model=MessageResponse,
    summary="Dosyayı tamamen sil",
)
def delete_file(
    file_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verilen ID'ye sahip dosyayı (MinIO ve veritabanı üzerinden) kalıcı olarak siler.
    """
    return FileService(db).delete_file(file_id, current_user)
