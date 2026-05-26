"""
Test Altyapısı — Ortak Fixture'lar (conftest.py)

Gerçek PostgreSQL test veritabanı kullanır (unitrack_test).
SQLite yerine PostgreSQL: UUID, Enum ve diğer özel tipler sorunsuz çalışır.

Her test fonksiyonu: tabloları kurar → test → tabloları temizler.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.core.security import hash_password
from app.common.enums import UserRole
from app.features.auth.auth_model import User
# RevokedToken auth_service içinde lazy import edilir; create_all'dan önce
# Base.metadata'ya kaydolması için burada açıkça import edilir (yoksa refresh
# testlerinde "relation revoked_tokens does not exist" hatası alınır).
from app.features.auth.revoked_token_model import RevokedToken  # noqa: F401
from app.core.limiter import limiter
from unittest.mock import patch, MagicMock

# Testlerde rate limit kapalı tutulur — fonksiyon-scope'lu token fixture'ları
# her testte yeniden login olur ve /auth/login 10/dk sınırını tetikleyip 429 döndürür.
limiter.enabled = False

# PostgreSQL test veritabanı (Docker üzerinden localhost:5432)
TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/unitrack_test"

engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def setup_database(request):
    """Her test fonksiyonu için tabloları oluştur, sonra yok et.
    unit marker'lı testlerde DB kurulumu atlanır."""
    if "unit" in request.keywords:
        yield
        return
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db():
    """Test veritabanı session'ı döner."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db):
    """
    DB dependency override'lı FastAPI TestClient.
    Gerçek PostgreSQL test DB kullanır.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --- Kullanıcı Fixture'ları ---

@pytest.fixture
def student_user(db):
    """Kayıtlı öğrenci kullanıcısı oluşturur."""
    user = User(
        email="student@ogr.uni.edu.tr",
        password_hash=hash_password("Test1234!"),
        first_name="Test",
        last_name="Öğrenci",
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def teacher_user(db):
    """Kayıtlı öğretmen kullanıcısı oluşturur."""
    user = User(
        email="teacher@uni.edu.tr",
        password_hash=hash_password("Test1234!"),
        first_name="Test",
        last_name="Öğretmen",
        role=UserRole.TEACHER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db):
    """Kayıtlı admin kullanıcısı oluşturur."""
    user = User(
        email="admin@uni.edu.tr",
        password_hash=hash_password("Test1234!"),
        first_name="Test",
        last_name="Admin",
        role=UserRole.ADMIN,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def department(db):
    """Test bölümü oluşturur (course.department_id zorunlu olduğu için)."""
    from app.features.department.department_model import Department
    dep = Department(name="Bilgisayar Mühendisliği", code="235")
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


# --- Token Fixture'ları ---

@pytest.fixture
def student_token(client, student_user):
    """Öğrenci için geçerli access token döner."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "student@ogr.uni.edu.tr",
        "password": "Test1234!",
    })
    return resp.json()["access_token"]


@pytest.fixture
def student_refresh_token(client, student_user):
    """Öğrenci için geçerli refresh token döner."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "student@ogr.uni.edu.tr",
        "password": "Test1234!",
    })
    return resp.json()["refresh_token"]


@pytest.fixture
def teacher_token(client, teacher_user):
    """Öğretmen için geçerli access token döner."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "teacher@uni.edu.tr",
        "password": "Test1234!",
    })
    return resp.json()["access_token"]


@pytest.fixture
def admin_token(client, admin_user):
    """Admin için geçerli access token döner."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@uni.edu.tr",
        "password": "Test1234!",
    })
    return resp.json()["access_token"]


@pytest.fixture(scope="session", autouse=True)
def mock_minio():
    """
    Testler sırasında MinIO (S3) sunucusuna gerçek istek gitmesini engeller.
    Yoksa container (app_core_storage) başlatılırken getaddrinfo failed - timeout alır.
    """
    with patch("app.core.storage.Minio") as mock:
        yield mock

