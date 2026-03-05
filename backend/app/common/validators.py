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
