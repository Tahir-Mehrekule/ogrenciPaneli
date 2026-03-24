"""
Dosya yükleme (File Upload) iş mantığı servisi.
"""

from uuid import UUID, uuid4
import math
from fastapi import UploadFile

from sqlalchemy.orm import Session

from app.common.base_dto import PaginatedResponse
from app.common.enums import ReportStatus, UserRole
from app.common.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.features.file.file_model import FileUpload
from app.features.file.file_repo import FileRepo
from app.features.file.file_dto import FileUploadResponse
from app.features.report.report_repo import ReportRepo
from app.features.auth.auth_model import User
from app.core.storage import get_storage_client

class FileService:
    """Dosya yönetimi iş mantığı servisi."""

    def __init__(self, db: Session):
        self.db = db
        self.file_repo = FileRepo(db)
        self.report_repo = ReportRepo(db)

    def upload_report_file(self, report_id: UUID, file: UploadFile, current_user: User) -> FileUploadResponse:
        """
        Raporlara dosya yükler.
        Kurallar:
        - Sadece rapor sahibi yükleyebilir.
        - Sadece DRAFT durumundaki raporlara dosya eklenebilir.
        """
        report = self.report_repo.get_by_id_or_404(report_id)

        # Sahibi mi?
        if str(report.submitted_by) != str(current_user.id):
            raise ForbiddenException("Sadece kendi raporunuza dosya yükleyebilirsiniz")

        # DRAFT mi?
        if report.status != ReportStatus.DRAFT:
            raise BadRequestException(f"Sadece DRAFT raporlara dosya yüklenebilir. Mevcut durum: {report.status.value}")

        # Benzersiz storage_key oluştur
        # Örnek: reports/cf1d9.../örnek_sunum.pdf
        safe_filename = file.filename.replace(" ", "_")
        storage_key = f"reports/{report_id}/{uuid4().hex}_{safe_filename}"
        
        # MinIO'ya Yükle
        # FastAPI UploadFile için dosya boyutu
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        storage_client = get_storage_client()
        storage_client.upload_file(
            file_data=file.file,
            object_name=storage_key,
            file_size=file.size,
            content_type=file.content_type,
        )

        # Veritabanına kaydet
        file_data_db = {
            "report_id": report_id,
            "uploaded_by": current_user.id,
            "original_name": file.filename,
            "storage_key": storage_key,
            "file_size": file_size,
            "mime_type": file.content_type
        }
        
        file_record = self.file_repo.create(file_data_db)
        
        response_dto = FileUploadResponse.model_validate(file_record)
        response_dto.download_url = storage_client.get_presigned_url(file_record.storage_key)
        return response_dto

    def list_report_files(self, report_id: UUID, current_user: User) -> list[FileUploadResponse]:
        """
        Belirli bir rapora yüklenmiş dosyaları listeler.
        Öğrenci ise sadece kendi raporundakileri görebilir; öğretmen/admin ise her raporunkini görebilir.
        """
        report = self.report_repo.get_by_id_or_404(report_id)

        # Öğrenci ise kendi raporu olmalı
        if current_user.role == UserRole.STUDENT and str(report.submitted_by) != str(current_user.id):
            raise ForbiddenException("Bu raporun dosyalarını görüntüleme yetkiniz yok")

        # Filtreli getirme
        files, _ = self.file_repo.get_many(filters={"report_id": report_id})
        
        result = []
        storage_client = get_storage_client()
        for f in files:
            dto = FileUploadResponse.model_validate(f)
            # MinIO'dan 1 saatlik geçici indirme linki al
            dto.download_url = storage_client.get_presigned_url(f.storage_key)
            result.append(dto)
            
        return result

    def delete_file(self, file_id: UUID, current_user: User) -> dict:
        """
        Dosyayı MinIO'dan ve veritabanından kalıcı olarak (hard delete) siler.
        Sadece dosyayı yükleyen veya ADMIN silebilir.
        Eğer rapor DRAFT değilse dosyayı yükleyen kişi bile silemez.
        """
        file_record = self.file_repo.get_by_id_or_404(file_id)
        
        # Admin değilse ek kontroller
        if current_user.role != UserRole.ADMIN:
            # Kendisi mi yüklemiş?
            if str(file_record.uploaded_by) != str(current_user.id):
                raise ForbiddenException("Sadece kendi yüklediğiniz dosyaları silebilirsiniz")
                
            # Rapor DRAFT durumunda mı?
            report = self.report_repo.get_by_id_or_404(file_record.report_id)
            if report.status != ReportStatus.DRAFT:
                raise BadRequestException("Sadece DRAFT durumundaki raporlardan dosya silinebilir")

        # Önce MinIO'dan sil
        storage_client = get_storage_client()
        storage_client.delete_file(file_record.storage_key)
        
        # Sonra DB'den kalıcı sil
        self.file_repo.hard_delete(file_id)
        
        return {"message": "Dosya başarıyla silindi"}
