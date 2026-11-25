"""
Dosya yükleme (File Upload) iş mantığı servisi.
"""

import os
import re

from uuid import UUID, uuid4
from fastapi import UploadFile

from sqlalchemy.orm import Session

from app.base.base_dto import PaginatedResponse
from app.base.base_service import BaseService
from app.common.enums import UserRole, ReportStatus
from app.common.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.features.file.file_model import FileUpload
from app.features.file.file_repo import FileRepo
from app.features.file.file_dto import FileUploadResponse
from app.features.report.report_repo import ReportRepo
from app.features.auth.auth_model import User
from app.core.storage import get_storage_client


# P1: dosya yükleme guard'ları — servis başına tek kaynak.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
    "application/zip",
}
_ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".ppt", ".pptx", ".txt", ".csv", ".png", ".jpg", ".jpeg", ".zip",
}


def _sanitize_filename(filename: str | None) -> str:
    base = os.path.basename(filename or "dosya")
    base = base.replace(" ", "_")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base[:100] or "dosya"


def _validate_upload(file: UploadFile, file_size: int) -> None:
    if file_size <= 0:
        raise BadRequestException("Boş dosya yüklenemez")
    if file_size > MAX_UPLOAD_BYTES:
        raise BadRequestException("Dosya en fazla 10 MB olabilir")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise BadRequestException(f"Desteklenmeyen dosya uzantısı: {ext or '?'}")
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestException(
            f"Desteklenmeyen dosya tipi: {file.content_type}"
        )


class FileService(BaseService[FileUpload, FileRepo]):
    """Dosya yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        super().__init__(FileRepo, db)
        self.report_repo = ReportRepo(db)

    def upload_report_file(self, report_id: UUID, file: UploadFile, current_user: User) -> FileUploadResponse:
        """
        Raporlara dosya yükler.
        Kurallar:
        - Sadece rapor sahibi yükleyebilir.
        - Sadece DRAFT durumundaki raporlara dosya eklenebilir.
        """
        report = self.report_repo.get_by_id_or_404(report_id)

        if not self.is_owner(report, "submitted_by", current_user):
            raise ForbiddenException("Sadece kendi raporunuza dosya yükleyebilirsiniz")

        if report.status != ReportStatus.DRAFT:
            raise BadRequestException("Dosya sadece DRAFT durumundaki raporlara yüklenebilir")

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        _validate_upload(file, file_size)

        safe_filename = _sanitize_filename(file.filename)
        storage_key = f"reports/{report_id}/{uuid4().hex}_{safe_filename}"

        storage_client = get_storage_client()
        storage_client.upload_file(
            file_data=file.file,
            object_name=storage_key,
            file_size=file.size,
            content_type=file.content_type,
        )

        file_data_db = {
            "report_id": report_id,
            "uploaded_by": current_user.id,
            "original_name": file.filename,
            "storage_key": storage_key,
            "file_size": file_size,
            "mime_type": file.content_type,
        }

        file_record = self.repo.create(file_data_db)

        response_dto = FileUploadResponse.model_validate(file_record)
        response_dto.download_url = storage_client.get_presigned_url(file_record.storage_key)
        return response_dto

    def list_report_files(self, report_id: UUID, current_user: User) -> list[FileUploadResponse]:
        """
        Belirli bir rapora yüklenmiş dosyaları listeler.
        - STUDENT: sadece kendi raporu
        - TEACHER: sadece kendi dersine ait raporlar
        - ADMIN: tüm raporlar
        """
        report = self.report_repo.get_by_id_or_404(report_id)

        if current_user.role == UserRole.STUDENT and not self.is_owner(report, "submitted_by", current_user):
            raise ForbiddenException("Bu raporun dosyalarını görüntüleme yetkiniz yok")

        if current_user.role == UserRole.TEACHER:
            from app.features.project.project_repo import ProjectRepo
            from app.features.course.course_model import Course
            project = ProjectRepo(self.db).get_by_id_or_404(report.project_id)
            course = (
                self.db.query(Course).filter(Course.id == project.course_id).first()
                if project.course_id
                else None
            )
            if not course or not self.ids_equal(course.teacher_id, current_user.id):
                raise ForbiddenException("Bu rapor sizin derslerinize ait değil")

        files, _ = self.repo.get_many(filters={"report_id": report_id})

        storage_client = get_storage_client()
        result = []
        for f in files:
            dto = FileUploadResponse.model_validate(f)
            dto.download_url = storage_client.get_presigned_url(f.storage_key)
            result.append(dto)

        return result

    def delete_file(self, file_id: UUID, current_user: User) -> dict:
        """
        Dosyayı MinIO'dan ve veritabanından kalıcı olarak (hard delete) siler.
        Sadece dosyayı yükleyen veya ADMIN silebilir.
        Eğer rapor DRAFT değilse dosyayı yükleyen kişi bile silemez.
        """
        file_record = self.repo.get_by_id_or_404(file_id)

        if current_user.role != UserRole.ADMIN:
            if not self.is_owner(file_record, "uploaded_by", current_user):
                raise ForbiddenException("Sadece kendi yüklediğiniz dosyaları silebilirsiniz")

            report = self.report_repo.get_by_id_or_404(file_record.report_id)
            if report.status != ReportStatus.DRAFT:
                raise BadRequestException("Sadece DRAFT durumundaki raporlardan dosya silinebilir")

        storage_client = get_storage_client()
        storage_client.delete_file(file_record.storage_key)

        self.repo.delete(file_id)

        return {"message": "Dosya başarıyla silindi"}
