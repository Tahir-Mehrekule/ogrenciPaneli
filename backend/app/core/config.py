"""
Uygulama ayarları modülü.

Pydantic Settings ile .env dosyasından ortam değişkenlerini okur.
Tüm uygulama boyunca tek bir 'settings' objesi kullanılır.

Güvenlik kuralları:
- SECRET_KEY varsayılan değerdeyse ya da 32 karakterden kısaysa uygulama başlamaz.
- DEBUG production'da False olmalı.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, model_validator


_DEFAULT_SECRET = "change-this-secret-key-in-production"


class Settings(BaseSettings):
    """
    Uygulama konfigürasyonu.
    Tüm değerler .env dosyasından okunur, varsayılan değerler tanımlıdır.
    """

    # --- Veritabanı ---
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/unitrack",
        description="PostgreSQL bağlantı adresi"
    )

    # --- JWT Authentication ---
    SECRET_KEY: str = Field(
        default=_DEFAULT_SECRET,
        description="JWT token imzalama anahtarı (en az 32 karakter, rastgele)"
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="JWT imzalama algoritması"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15,
        description="Access token geçerlilik süresi (dakika)"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token geçerlilik süresi (gün)"
    )

    # --- OpenRouter AI API ---
    OPENROUTER_API_KEY: str = Field(
        default="",
        description="OpenRouter API anahtarı"
    )
    OPENROUTER_BASE_URL: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter API base URL"
    )

    # --- Uygulama Bilgileri ---
    APP_NAME: str = Field(
        default="UniTrack AI",
        description="Uygulama adı"
    )
    APP_VERSION: str = Field(
        default="1.0.0",
        description="Uygulama versiyonu"
    )
    DEBUG: bool = Field(
        default=False,
        description="Debug modu — production'da False olmalı"
    )

    # --- CORS ---
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:19006",
        description="İzin verilen origin'ler (virgülle ayrılmış)"
    )

    # --- MinIO (S3) Storage ---
    MINIO_ENDPOINT: str = Field(
        default="minio:9000",
        description="MinIO sunucu adresi (Docker içi: minio:9000)"
    )
    MINIO_ACCESS_KEY: str = Field(
        default="minioadmin",
        description="MinIO erişim anahtarı"
    )
    MINIO_SECRET_KEY: str = Field(
        default="minioadmin",
        description="MinIO gizli anahtarı"
    )
    MINIO_BUCKET_NAME: str = Field(
        default="unitrack-files",
        description="Depolanacak ana bucket adı"
    )
    MINIO_SECURE: bool = Field(
        default=False,
        description="HTTPS kullanılıp kullanılmayacağı (lokalde False)"
    )

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """
        Güvenlik doğrulamaları:
        - SECRET_KEY varsayılan veya çok kısa olamaz (production'da).
        - DEBUG=True iken uyarı verilir ama bloklanmaz (geliştirme için).
        """
        if not self.DEBUG:
            # Production modunda SECRET_KEY kontrolü
            if self.SECRET_KEY == _DEFAULT_SECRET:
                raise ValueError(
                    "SECRET_KEY varsayılan değerde! "
                    ".env dosyasında güçlü bir anahtar belirtin. "
                    "Üretmek için: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
                )
            if len(self.SECRET_KEY) < 32:
                raise ValueError(
                    f"SECRET_KEY en az 32 karakter olmalı (mevcut: {len(self.SECRET_KEY)} karakter)."
                )
        return self

    @property
    def allowed_origins_list(self) -> list[str]:
        """ALLOWED_ORIGINS string'ini listeye çevirir."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Uygulama genelinde kullanılacak tek settings objesi
settings = Settings()
