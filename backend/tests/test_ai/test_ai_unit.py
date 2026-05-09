"""
AI Unit Testleri

Prompt oluşturma ve API yanıt parse etme fonksiyonlarını test eder.
Gerçek API çağrısı yapmaz — saf iş mantığı testleri.
"""

import pytest
import json

pytestmark = pytest.mark.unit

from app.features.ai.ai_config import build_user_prompt
from app.features.ai.ai_manager import AIManager
from app.common.exceptions import AppException


class TestBuildUserPrompt:
    """Prompt şablonu oluşturma testleri."""

    def test_proje_bilgisi_prompt_içinde(self):
        """Proje başlığı ve açıklaması prompt içinde yer alır."""
        prompt = build_user_prompt("Web Sitesi Projesi", "Okul için web sitesi yapılacak.")
        assert "Web Sitesi Projesi" in prompt
        assert "Okul için web sitesi yapılacak." in prompt

    def test_prompt_boş_değil(self):
        """Prompt boş string döndürmez."""
        prompt = build_user_prompt("Başlık", "Açıklama")
        assert len(prompt) > 0


class TestParseResponse:
    """OpenRouter API yanıtı parse etme testleri."""

    def setup_method(self):
        self.manager = AIManager()

    def test_geçerli_json_parse_edilir(self):
        """Geçerli JSON yanıt başarıyla parse edilir."""
        raw = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "tasks": [
                            {
                                "title": "Veritabanı tasarımı",
                                "description": "ER diyagramı oluştur",
                                "estimated_days": 3,
                                "priority": "high",
                            }
                        ]
                    })
                }
            }]
        }
        tasks = self.manager._parse_response(raw)
        assert len(tasks) == 1
        assert tasks[0].title == "Veritabanı tasarımı"
        assert tasks[0].priority == "high"

    def test_markdown_kod_bloğu_temizlenir(self):
        """```json blokları otomatik temizlenir."""
        content = '```json\n{"tasks": [{"title": "Görev", "description": "Açıklama", "estimated_days": 2, "priority": "medium"}]}\n```'
        raw = {"choices": [{"message": {"content": content}}]}
        tasks = self.manager._parse_response(raw)
        assert len(tasks) == 1
        assert tasks[0].title == "Görev"

    def test_geçersiz_json_hata_fırlatır(self):
        """Geçersiz JSON formatı → AppException."""
        raw = {
            "choices": [{
                "message": {
                    "content": "Bu geçerli bir JSON değil {broken"
                }
            }]
        }
        with pytest.raises(AppException):
            self.manager._parse_response(raw)

    def test_eksik_choices_hata_fırlatır(self):
        """Beklenen yapı yoksa → AppException."""
        raw = {"unexpected_key": "value"}
        with pytest.raises(AppException):
            self.manager._parse_response(raw)
