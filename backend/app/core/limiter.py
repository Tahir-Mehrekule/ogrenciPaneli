"""
Rate limiter modülü.

slowapi kütüphanesi kullanılarak IP bazlı istek sınırlaması sağlanır.
Auth endpoint'lerini brute-force ve spam saldırılarından korur.

Kullanım:
    from app.core.limiter import limiter

    @router.post("/login")
    @limiter.limit("5/minute")
    def login(request: Request, ...):
        ...
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# IP adresine göre sınırlama yapar
limiter = Limiter(key_func=get_remote_address)
