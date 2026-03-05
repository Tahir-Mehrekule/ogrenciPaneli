"""
Uygulama ayarları modülü.

Pydantic Settings ile .env dosyasından ortam değişkenlerini okur.
Tüm uygulama boyunca tek bir 'settings' objesi kullanılır.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


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
        default="change-this-secret-key-in-production",
        description="JWT token imzalama anahtarı"
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="JWT imzalama algoritması"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15,
        description="Access token geçerlilik süresi (dakika) — sliding expiration"
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
        default=True,
        description="Debug modu (production'da False olmalı)"
    )

    # --- CORS ---
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:19006",
        description="İzin verilen origin'ler (virgülle ayrılmış)"
    )

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
