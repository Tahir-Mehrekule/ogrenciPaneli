"""
Ortak validasyon (doğrulama) fonksiyonları.

Tüm feature'lar tarafından kullanılan paylaşımlı validasyon mantığı.
Email, YouTube URL ve rol belirleme gibi kontrolleri içerir.
"""

import re

from app.common.enums import UserRole
from app.common.exceptions import BadRequestException


def validate_school_email(email: str) -> None:
    """
    Email adresinin geçerli bir okul maili olup olmadığını kontrol eder.

    Kabul edilen formatlar:
    - ogrenci@ogr.universiteadi.edu.tr (öğrenci)
    - hoca@universiteadi.edu.tr (öğretmen)

    Args:
        email: Kontrol edilecek email adresi

    Raises:
        BadRequestException: Email okul maili değilse
    """
    email = email.lower().strip()

    # Temel email format kontrolü
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise BadRequestException("Geçersiz email formatı")

    # Okul maili kontrolü (.edu.tr ile bitmeli)
    if not email.endswith(".edu.tr"):
        raise BadRequestException(
            "Sadece okul mail adresi (.edu.tr) ile kayıt olunabilir"
        )


def determine_role_from_email(email: str) -> UserRole:
    """
    Email adresinden kullanıcı rolünü otomatik belirler.

    Kural:
    - '@ogr.' içeriyorsa → STUDENT (öğrenci)
    - '.edu.tr' ile bitiyorsa ama '@ogr.' yoksa → TEACHER (öğretmen)

    Not: ADMIN rolü sadece manuel olarak atanır, email'den belirlenmez.

    Args:
        email: Kullanıcının email adresi

    Returns:
        UserRole: Belirlenen rol (STUDENT veya TEACHER)
    """
    email = email.lower().strip()

    if "@ogr." in email:
        return UserRole.STUDENT
    else:
        return UserRole.TEACHER


def validate_youtube_url(url: str) -> None:
    """
    YouTube video linkinin geçerli formatta olup olmadığını kontrol eder.

    Kabul edilen formatlar:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://youtube.com/watch?v=VIDEO_ID

    Args:
        url: Kontrol edilecek YouTube URL'i

    Raises:
        BadRequestException: URL geçerli bir YouTube linki değilse
    """
    if not url or not url.strip():
        raise BadRequestException("YouTube linki boş olamaz")

    youtube_pattern = (
        r'^(https?://)?(www\.)?'
        r'(youtube\.com/watch\?v=|youtu\.be/)'
        r'[a-zA-Z0-9_-]{11}'
    )
    if not re.match(youtube_pattern, url.strip()):
        raise BadRequestException(
            "Geçersiz YouTube linki. Örnek format: https://www.youtube.com/watch?v=VIDEO_ID"
        )


# ─────────────── Student Number Parser ───────────────

_STUDENT_NO_RE = re.compile(r"^\d{9}$")


def parse_student_number(student_no: str) -> dict | None:
    """
    Öğrenci numarasını parse eder: YYY-BBB-CCC formatı (9 hane).

    Format:
        YYY: Giriş yılı son 3 hanesi (245 → 2024-2025 akademik yılı)
        BBB: 3 haneli bölüm kodu (departments.code ile eşleşir)
        CCC: 3 haneli sıra numarası

    Args:
        student_no: 9 haneli öğrenci numarası

    Returns:
        dict | None — şu alanlarla:
            {
                "year_prefix": "245",
                "entry_year": 2024,                # YYY=245 → 2024 (akademik yıl başı)
                "academic_year": "2024-2025",
                "department_code": "235",
                "sequence": "024",
                "sequence_int": 24,
            }
        Format yanlışsa None döner. Bölüm kodu lookup'ı yapılmaz — caller'a bırakılır.
    """
    if not student_no:
        return None
    s = student_no.strip()
    if not _STUDENT_NO_RE.match(s):
        return None

    year_prefix = s[0:3]
    department_code = s[3:6]
    sequence = s[6:9]

    # Giriş yılı: "245" → 2024. (2020'ler için 200 + son hane * 10 değil — sade kabul:
    # 21. yüzyıl içinde "YYY" → 2000 + (YYY - 200) kısaca: 2YYY)
    # Örn: 245 → 2024, 246 → 2025, 245 = 24. yıl + 5. yıl son hanesi.
    # Pratikte: ilk iki hane "24" → giriş yılı 2024. Son hane akademik takvim için.
    # Sade implementasyon: ilk 2 hane = giriş yılının 2000'den farkı.
    try:
        entry_year = 2000 + int(year_prefix[:2])
    except ValueError:
        return None

    academic_year = f"{entry_year}-{entry_year + 1}"

    return {
        "year_prefix": year_prefix,
        "entry_year": entry_year,
        "academic_year": academic_year,
        "department_code": department_code,
        "sequence": sequence,
        "sequence_int": int(sequence),
    }
