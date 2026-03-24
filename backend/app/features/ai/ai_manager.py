"""
AI Manager modülü.

OpenRouter API çağrısını yönetir.
Prompt oluşturma, API isteği ve yanıt parse etme işlemlerini yapar.
"""

import json
import httpx

from app.common.exceptions import AppException
from app.features.ai.ai_config import (
    OPENROUTER_ENDPOINT,
    DEFAULT_MODEL,
    SYSTEM_PROMPT,
    REPORT_ANALYSIS_SYSTEM_PROMPT,
    build_user_prompt,
    build_report_analysis_prompt,
    get_headers,
)
from app.features.ai.ai_dto import AITaskSuggestion


def call_openrouter(title: str, description: str) -> list[AITaskSuggestion]:
    """
    OpenRouter API'ye istek atarak AI görev önerisi alır.

    Akış:
    1. Prompt oluştur
    2. httpx ile API'ye sync POST isteği at
    3. Yanıtı parse et
    4. AITaskSuggestion listesine dönüştür

    Args:
        title: Proje başlığı
        description: Proje açıklaması

    Returns:
        list[AITaskSuggestion]: Önerilen görevler

    Raises:
        AppException: API başarısız olursa veya yanıt parse edilemezse
    """
    user_prompt = build_user_prompt(title, description)

    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                OPENROUTER_ENDPOINT,
                headers=get_headers(),
                json=payload,
            )
            response.raise_for_status()

    except httpx.TimeoutException:
        raise AppException(
            detail="AI servisi yanıt vermedi. Lütfen tekrar deneyin.",
            status_code=503,
        )
    except httpx.HTTPStatusError as e:
        raise AppException(
            detail=f"AI servisi hatası: {e.response.status_code}",
            status_code=503,
        )
    except Exception as e:
        raise AppException(
            detail="AI servisine bağlanırken hata oluştu.",
            status_code=503,
        )

    return _parse_response(response.json())


def _parse_response(raw: dict) -> list[AITaskSuggestion]:
    """
    OpenRouter API yanıtını AITaskSuggestion listesine dönüştürür.

    Args:
        raw: API'den gelen ham JSON yanıt

    Returns:
        list[AITaskSuggestion]: Parse edilmiş görev önerileri

    Raises:
        AppException: Yanıt beklenmeyen formatta ise
    """
    try:
        # API yanıtının content alanını al
        content = raw["choices"][0]["message"]["content"].strip()

        # JSON bloğu varsa temizle (``` işaretleri)
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        parsed = json.loads(content)
        tasks_data = parsed.get("tasks", [])

        return [AITaskSuggestion(**task) for task in tasks_data]

    except (KeyError, IndexError, json.JSONDecodeError, TypeError) as e:
        raise AppException(
            detail="AI yanıtı işlenirken hata oluştu. Lütfen tekrar deneyin.",
            status_code=500,
        )


def call_openrouter_for_report(title: str, content: str) -> dict:
    """
    OpenRouter API'ye istek atarak Rapor Analizi alır.
    """
    user_prompt = build_report_analysis_prompt(title, content)

    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": REPORT_ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                OPENROUTER_ENDPOINT,
                headers=get_headers(),
                json=payload,
            )
            response.raise_for_status()
            
    except httpx.TimeoutException:
        raise AppException(detail="AI servisi yanıt vermedi.", status_code=503)
    except httpx.HTTPStatusError as e:
        raise AppException(detail=f"AI servisi hatası: {e.response.status_code}", status_code=503)
    except Exception:
        raise AppException(detail="AI servisine bağlanırken hata oluştu.", status_code=503)

    return _parse_report_response(response.json())


def _parse_report_response(raw: dict) -> dict:
    """Yanıtı parse edip JSON dict'ine dönüştürür."""
    try:
        content = raw["choices"][0]["message"]["content"].strip()

        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        parsed = json.loads(content)
        return {
            "summary": parsed.get("summary", ""),
            "strengths": parsed.get("strengths", []),
            "weaknesses": parsed.get("weaknesses", []),
            "recommendations": parsed.get("recommendations", [])
        }
    except (KeyError, IndexError, json.JSONDecodeError, TypeError):
        raise AppException(detail="AI yanıtı işlenirken format hatası oluştu.", status_code=500)
