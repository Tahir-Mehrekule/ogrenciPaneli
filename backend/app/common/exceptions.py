"""
Özel hata (exception) sınıfları.

Tüm feature'lar bu hata sınıflarını kullanır.
Her hata sınıfı belirli bir HTTP status code'a karşılık gelir.
Global exception handler (exception_handlers.py) bu hataları yakalar ve uygun response döner.
"""


class AppException(Exception):
    """
    Tüm özel hataların base sınıfı.
    Diğer tüm exception'lar bundan türer.

    Args:
        detail: Hata mesajı (kullanıcıya gösterilir)
        status_code: HTTP status kodu
    """

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class NotFoundException(AppException):
    """
    Kayıt bulunamadı (404).
    Örnek: Verilen ID ile kullanıcı/proje/görev bulunamadığında.
    """

    def __init__(self, detail: str = "Kayıt bulunamadı"):
        super().__init__(detail=detail, status_code=404)


class BadRequestException(AppException):
    """
    Geçersiz istek (400).
    Örnek: Geçersiz email formatı, eksik zorunlu alan.
    """

    def __init__(self, detail: str = "Geçersiz istek"):
        super().__init__(detail=detail, status_code=400)


class UnauthorizedException(AppException):
    """
    Kimlik doğrulama hatası (401).
    Örnek: Yanlış şifre, geçersiz token.
    """

    def __init__(self, detail: str = "Kimlik doğrulama başarısız"):
        super().__init__(detail=detail, status_code=401)


class ForbiddenException(AppException):
    """
    Yetkisiz erişim (403).
    Örnek: Öğrenci admin paneline erişmeye çalıştığında.
    """

    def __init__(self, detail: str = "Bu işlem için yetkiniz bulunmuyor"):
        super().__init__(detail=detail, status_code=403)


class ConflictException(AppException):
    """
    Çakışma (409).
    Örnek: Aynı email ile tekrar kayıt, aynı haftaya tekrar rapor yükleme.
    """

    def __init__(self, detail: str = "Bu kayıt zaten mevcut"):
        super().__init__(detail=detail, status_code=409)
