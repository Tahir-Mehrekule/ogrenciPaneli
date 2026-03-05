"""
Veritabanı bağlantı modülü.

SQLAlchemy engine, session ve Base sınıfını tanımlar.
Tüm modeller Base'den türer, tüm DB işlemleri SessionLocal üzerinden yapılır.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings


# SQLAlchemy Engine — PostgreSQL'e bağlantı motoru
# pool_pre_ping: Her bağlantıdan önce "canlı mı?" kontrolü yapar (kopan bağlantıları tespit eder)
# pool_size: Havuzda tutulacak varsayılan bağlantı sayısı
# max_overflow: pool_size dolduğunda açılabilecek ekstra bağlantı sayısı
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,  # Debug modunda SQL sorgularını konsola yazdırır
)

# Session Factory — Her API isteğinde yeni bir DB oturumu üretir
# autocommit=False: İşlemleri manuel commit etmemiz gerekir (güvenli)
# autoflush=False: Otomatik flush kapalı, kontrolü bize bırakır
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base — Tüm SQLAlchemy modelleri bu sınıftan türer
# Modeller (User, Project, Task vb.) bu Base'i kullanarak tablo tanımlar
Base = declarative_base()


def get_db():
    """
    FastAPI dependency: Her API isteğinde bir DB session oluşturur,
    istek tamamlandığında (başarılı veya hatalı) session'ı kapatır.

    Kullanım:
        @router.get("/users")
        def get_users(db: Session = Depends(get_db)):
            ...

    Yields:
        Session: SQLAlchemy veritabanı oturumu
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
