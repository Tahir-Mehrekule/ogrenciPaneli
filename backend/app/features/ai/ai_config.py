"""
AI Config modülü.

OpenRouter API bağlantı ayarları ve prompt şablonunu tanımlar.
API key ve model adı .env'den okunur.
"""

from app.core.config import settings


# OpenRouter API ayarları
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_ENDPOINT = f"{OPENROUTER_BASE_URL}/chat/completions"

# Kullanılacak model (ücretsiz ve güçlü)
DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

# API isteği için header'lar
def get_headers() -> dict:
    """OpenRouter API için gerekli header'ları döner."""
    return {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://unitrack-ai.app",
        "X-Title": "UniTrack AI",
    }


# Prompt şablonu
SYSTEM_PROMPT = """Sen bir proje yönetim asistanısın. 
Sana verilen proje bilgilerine göre, projeyi tamamlamak için gerekli görevleri Türkçe olarak öneriyorsun.

KURALLAR:
- Görevler somut ve uygulanabilir olmalı
- Her görevin başlığı kısa ve net olmalı (maks 10 kelime)
- Açıklamalar ne yapılacağını net şekilde anlatmalı
- Tahmini süreler gerçekçi olmalı
- Öncelik: "low", "medium" veya "high" olmalı

YANIT FORMATI (sadece JSON, başka hiçbir şey ekleme):
{
  "tasks": [
    {
      "title": "Görev başlığı",
      "description": "Görev açıklaması",
      "estimated_days": 3,
      "priority": "high"
    }
  ]
}"""


def build_user_prompt(title: str, description: str) -> str:
    """
    Proje bilgisinden kullanıcı prompt'unu oluşturur.

    Args:
        title: Proje başlığı
        description: Proje açıklaması

    Returns:
        Formatlı prompt string'i
    """
    return f"""Proje Başlığı: {title}

Proje Açıklaması: {description}

Bu projeyi tamamlamak için 5-8 adet görev öner. Sadece JSON formatında yanıt ver."""
