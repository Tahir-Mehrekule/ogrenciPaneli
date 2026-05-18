"""
AI Config modülü.

OpenRouter API bağlantı ayarları ve prompt şablonunu tanımlar.
API key ve model adı .env'den okunur.
"""

from app.core.config import settings


# OpenRouter API ayarları
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_ENDPOINT = f"{OPENROUTER_BASE_URL}/chat/completions"

# Kullanılacak model
DEFAULT_MODEL = "minimax/minimax-m2.5"

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


REPORT_ANALYSIS_SYSTEM_PROMPT = """Sen bir proje yönetim asistanı ve eğitim mentorusun.
Sana bir öğrencinin haftalık proje raporu verilecek. Raporu dikkatlice analiz et.

KURALLAR:
- Analizi objektif ve yapıcı bir dille yap.
- Güçlü yönleri ve gelişime açık eksikleri (zayıf yönleri) net bir şekilde listele.
- Gelecek haftalar için somut ve uygulanabilir tavsiyeler ver.

YANIT FORMATI (sadece JSON, başka hiçbir şey ekleme):
{
  "summary": "Raporun iki üç cümlelik genel özeti",
  "strengths": ["Güçlü yön 1", "Güçlü yön 2"],
  "weaknesses": ["Eksik yön 1", "Eksik yön 2"],
  "recommendations": ["Tavsiye 1", "Tavsiye 2"]
}"""


def build_report_analysis_prompt(title: str, content: str) -> str:
    """Rapor içeriğinden kullanıcı prompt'unu oluşturur."""
    return f"Rapor Başlığı: {title}\n\nRapor İçeriği:\n{content}\n\nLütfen bu raporu analiz et ve istenen JSON formatında yanıt ver."


# ─────────────── Öğretmen Cevap Önerisi (Paket 4A) ───────────────

FEEDBACK_TONES = {
    "constructive": "Yapıcı ve dengeli: hem olumlu yönleri hem gelişim alanlarını vurgula.",
    "encouraging":  "Cesaret verici ve destekleyici: özellikle motivasyon yükseltici ifadeler kullan.",
    "critical":     "Daha eleştirel ve dürüst: eksikleri açıkça belirt, gerekirse sert ama saygılı ol.",
}

FEEDBACK_SUGGESTION_SYSTEM_PROMPT = """Sen tecrübeli bir öğretim üyesisin.
Sana bir öğrencinin haftalık proje raporu, dersin adı ve istenen geri bildirim tonu verilecek.
Senin görevin: öğretmen yerine, raporun altına yazılabilecek 2-4 cümlelik kısa bir Türkçe geri bildirim taslağı üretmek.

KURALLAR:
- Çıktın doğrudan öğretmenin metinle göndereceği geri bildirim olsun (paragraf, açıklama vermeden).
- İstenen tonu (yapıcı/cesaret verici/eleştirel) hissedilir derecede uygula.
- En az 30 karakter, en fazla 600 karakter olsun.
- Bullet, başlık, JSON, kod bloğu KULLANMA — sadece düz metin.
- Öğrencinin ismine veya 3. şahıslara hitap etme; "Bu hafta..." gibi rapor odaklı yaz.
"""


def build_feedback_suggestion_prompt(
    course_name: str, week_number: int, year: int,
    report_content: str, tone_label: str, tone_desc: str,
) -> str:
    """Öğretmen cevap önerisi için user prompt'u oluşturur."""
    return (
        f"Ders: {course_name}\n"
        f"Hafta: {week_number} ({year} akademik yılı)\n"
        f"İstenen Ton: {tone_label} — {tone_desc}\n\n"
        f"Rapor İçeriği:\n{report_content}\n\n"
        f"Lütfen yukarıdaki rapora yönelik 2-4 cümlelik geri bildirim taslağını sadece düz metin olarak yaz."
    )

