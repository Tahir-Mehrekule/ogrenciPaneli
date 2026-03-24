"""
Dosya yükleme DTO (Veri transfer objesi) modülü.
"""

from uuid import UUID
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FileUploadResponse(BaseModel):
    """API'den dönülecek dosya metadatası ve indirme bağlantısı."""
    id: UUID
    report_id: UUID
    original_name: str
    file_size: int
    mime_type: str
    created_at: datetime
    
    # MinIO geçici (presigned) URL'si. Veritabanından gelmez, servisten hesaplanır.
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
