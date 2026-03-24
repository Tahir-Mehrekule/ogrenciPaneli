"""
S3 uyumlu dosya depolama işlemleri (MinIO).

Dosyaları (PDF, Word, vb.) sunucuda değil, MinIO (S3) üzerinde depolarız.
"""

from typing import BinaryIO
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

class StorageClient:
    """MinIO (S3) istemcisi."""

    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Bucket yoksa oluşturur."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except Exception as e:
            print(f"MinIO bucket error or connection error: {e}")

    def upload_file(self, file_data: BinaryIO, object_name: str, file_size: int, content_type: str) -> None:
        """
        Dosyayı MinIO'ya yükler.
        """
        try:
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_data,
                length=file_size,
                content_type=content_type,
            )
        except S3Error as e:
            from app.common.exceptions import BadRequestException
            raise BadRequestException(f"Dosya yükleme hatası: {str(e)}")

    def delete_file(self, object_name: str) -> None:
        """
        Dosyayı MinIO'dan siler.
        """
        try:
            self.client.remove_object(self.bucket_name, object_name)
        except S3Error as e:
            print(f"Dosya silme hatası: {e}")

    def get_presigned_url(self, object_name: str, expiry_seconds: int = 3600) -> str:
        """
        Dosyaya geçici (süreli) erişim linki üretir.
        expiry_seconds: Linkin geçerlilik süresi (varsayılan: 1 saat)
        """
        try:
            from datetime import timedelta
            url = self.client.presigned_get_object(
                self.bucket_name, 
                object_name, 
                expires=timedelta(seconds=expiry_seconds)
            )
            return url
        except S3Error as e:
            return ""

_storage_client = None

def get_storage_client() -> StorageClient:
    """Tembel (lazy) yükleme. Sadece ihtiyaç anında MinIO istemcisini ayağa kaldırır."""
    global _storage_client
    if _storage_client is None:
        _storage_client = StorageClient()
    return _storage_client
