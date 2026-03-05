"""
Global hata yakalayıcı (exception handler) modülü.

AppException ve alt sınıflarını yakalayıp standart JSON response'a dönüştürür.
Beklenmeyen hatalar için 500 Internal Server Error handler'ı içerir.
main.py'da register_exception_handlers() ile uygulamaya eklenir.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.common.exceptions import AppException


def register_exception_handlers(app: FastAPI) -> None:
    """
    Tüm global exception handler'ları FastAPI uygulamasına kaydeder.
    main.py'da app oluşturulduktan sonra çağrılır.

    Args:
        app: FastAPI uygulama instance'ı
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """
        AppException ve tüm alt sınıflarını yakalar.
        NotFoundException, BadRequestException, ForbiddenException vb.
        hepsi bu handler tarafından işlenir.

        Response formatı:
        {
            "detail": "Hata mesajı",
            "status_code": 404
        }
        """
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "status_code": exc.status_code,
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """
        Beklenmeyen (yakalanmamış) hataları yakalar.
        Production'da kullanıcıya detay göstermez, sadece genel mesaj verir.
        Debug modunda hata detayını da döner.
        """
        from app.core.config import settings

        detail = "Sunucu hatası oluştu"
        if settings.DEBUG:
            detail = f"Sunucu hatası: {str(exc)}"

        return JSONResponse(
            status_code=500,
            content={
                "detail": detail,
                "status_code": 500,
            },
        )
