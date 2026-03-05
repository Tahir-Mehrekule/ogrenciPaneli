# 📚 UniTrack AI — Proje Dosya Dokümantasyonu

Projede bulunan tüm kod dosyalarının ne işe yaradığını, içindeki her kod bloğunun görevini bölüm bölüm açıklayan dokümandır.

---

## 📁 Kök Dizin (`ogrenciPaneli/`)

---

### `.gitignore`
Git tarafından takip edilmeyecek dosya ve klasörleri belirler.

```
__pycache__/          → Python'un derlediği cache dosyaları
*.py[cod]             → Derlenmiş Python dosyaları (.pyc, .pyo, .pyd)
venv/ .venv/ env/     → Python sanal ortam klasörleri
.env                  → Ortam değişkenleri dosyası (gizli bilgiler içerir)
.vscode/ .idea/       → IDE ayar dosyaları
.DS_Store Thumbs.db   → İşletim sistemi geçici dosyaları
.pytest_cache/        → Test cache'i
node_modules/         → Node.js bağımlılıkları (frontend için)
```

---

### `docker-compose.yml`

```yaml
version: "3.9"
```
Docker Compose dosya versiyonu.

```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: unitrack-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: unitrack
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
```
**DB servisi**: PostgreSQL 15 veritabanını ayağa kaldırır. `unitrack` adlı DB'yi oluşturur, 5432 portunda çalışır. `volumes` ile veriler kalıcı tutulur. `healthcheck` ile DB'nin hazır olup olmadığını kontrol eder.

```yaml
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: unitrack-api
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/unitrack
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
**API servisi**: Backend'i Docker içinde çalıştırır. DB sağlıklı olduktan sonra başlar (`depends_on`). `--reload` ile kod değişikliklerinde otomatik yeniden başlar.

---

## 📁 Backend (`backend/`)

---

### `Dockerfile`

```dockerfile
FROM python:3.11-slim
```
Python 3.11 slim imajını temel alır (hafif Linux).

```dockerfile
WORKDIR /app
```
Container içinde çalışma dizinini `/app` olarak ayarlar.

```dockerfile
RUN apt-get update && apt-get install -y gcc libpq-dev
```
PostgreSQL bağlantısı için gerekli sistem kütüphanelerini yükler.

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```
Önce sadece `requirements.txt`'i kopyalar ve bağımlılıkları yükler (Docker cache optimizasyonu).

```dockerfile
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
Tüm kodu kopyalar, 8000 portunu açar ve uvicorn ile FastAPI'yi başlatır.

---

### `.env.example`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unitrack
```
PostgreSQL bağlantı adresi — kullanıcı adı, şifre, host, port ve DB adı.

```env
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```
JWT ayarları — token imzalamak için gizli anahtar, algoritma, access token süresi (30dk), refresh token süresi (7 gün).

```env
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```
AI API entegrasyonu için OpenRouter bilgileri.

```env
APP_NAME=UniTrack AI
APP_VERSION=1.0.0
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
```
Uygulama adı/versiyonu, debug modu ve CORS izinleri.

---

### `requirements.txt`

```
fastapi==0.115.6          → Web framework (API oluşturma)
uvicorn[standard]==0.34.0 → ASGI sunucu (FastAPI'yi çalıştırır)
sqlalchemy==2.0.36        → ORM (veritabanı işlemleri)
psycopg2-binary==2.9.10   → PostgreSQL Python driver'ı
alembic==1.14.1           → Veritabanı migration aracı
pydantic==2.10.4          → Veri validasyonu ve şema tanımlama
pydantic-settings==2.7.1  → .env dosyasından ayar okuma
python-dotenv==1.0.1      → .env dosyası yükleme
email-validator==2.2.0    → Email format doğrulama
python-jose[cryptography]==3.3.0 → JWT token oluşturma/doğrulama
passlib[bcrypt]==1.7.4    → Şifre hashleme (bcrypt)
httpx==0.28.1             → Async HTTP client (AI API çağrıları)
pytest==8.3.4             → Test framework
pytest-asyncio==0.25.0    → Async test desteği
python-multipart==0.0.20  → Form data/multipart işleme
```

---

## 📁 Common (`backend/app/common/`)

---

### `base_dto.py`

```python
T = TypeVar("T")
```
Generic tip tanımı — `PaginatedResponse`'da herhangi bir response tipi ile kullanılabilmesi için.

```python
class BaseResponse(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }
```
**BaseResponse**: Tüm API response'larının base sınıfı. Her response'ta `id`, `created_at`, `updated_at` bulunur. `from_attributes=True` sayesinde SQLAlchemy model objeleri doğrudan Pydantic modele dönüştürülebilir.

```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int
```
**PaginatedResponse**: Sayfalanmış liste response'u. `items` mevcut sayfadaki kayıtlar, `total` toplam kayıt sayısı, `page` mevcut sayfa, `size` sayfa başına kayıt, `pages` toplam sayfa. Generic yapıda olduğu için `PaginatedResponse[UserResponse]` gibi kullanılır.

```python
class MessageResponse(BaseModel):
    message: str
```
**MessageResponse**: Basit mesaj response'u. Silme, güncelleme gibi işlemlerde `{"message": "Başarıyla silindi"}` döner.

```python
class FilterParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    order: str = Field(default="desc", pattern="^(asc|desc)$")
    search: str | None = Field(default=None)
```
**FilterParams**: Liste endpoint'lerinde query parameter olarak kullanılır. `page` sayfa numarası (min 1), `size` sayfa başına kayıt (min 1, max 100), `sort_by` sıralama alanı, `order` sıralama yönü (sadece "asc" veya "desc"), `search` opsiyonel arama terimi.

---

### `base_model.py`

```python
from app.core.database import Base

class BaseModel(Base):
    __abstract__ = True
```
Tüm SQLAlchemy modellerinin türediği abstract sınıf. `__abstract__ = True` olduğu için kendi başına tablo oluşturmaz, sadece kalıtım için kullanılır.

```python
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
```
**id alanı**: UUID tipinde primary key. Her yeni kayıtta `uuid.uuid4` ile otomatik benzersiz ID üretilir. Index'lidir (hızlı arama).

```python
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```
**created_at**: Kayıt oluşturulduğunda UTC tarihini otomatik set eder. `nullable=False` — boş bırakılamaz.

```python
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```
**updated_at**: İlk oluşturmada ve her `UPDATE` sorgusunda (`onupdate`) otomatik güncellenir.

```python
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )
```
**is_active**: Soft delete mekanizması. `True`=aktif, `False`=silinmiş. Kayıt gerçekten silinmez, sadece bu flag değişir. Index'lidir.

---

### `base_repo.py`

```python
ModelType = TypeVar("ModelType", bound=BaseModel)
```
Generic model tipi — `BaseRepository`'nin hangi model ile çalışacağını belirler. `bound=BaseModel` ile sadece BaseModel'den türeyen sınıflar kabul edilir.

```python
class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db
```
Constructor'da hangi model sınıfı (`User`, `Project` vb.) ve hangi DB session'ı kullanılacağı belirlenir.

```python
    def create(self, obj_data: dict) -> ModelType:
        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
```
**create**: Dict'ten model objesi oluşturur, DB'ye ekler (`add`), kaydeder (`commit`), güncel halini çeker (`refresh`) ve döner.

```python
    def get_by_id(self, id: UUID, active_only: bool = True) -> ModelType | None:
        query = self.db.query(self.model).filter(self.model.id == id)
        if active_only:
            query = query.filter(self.model.is_active == True)
        return query.first()
```
**get_by_id**: ID ile kayıt arar. `active_only=True` ise sadece silinmemiş kayıtları getirir. Bulamazsa `None` döner.

```python
    def get_by_id_or_404(self, id: UUID, active_only: bool = True) -> ModelType:
        obj = self.get_by_id(id, active_only)
        if obj is None:
            raise NotFoundException(f"{self.model.__name__} bulunamadı: {id}")
        return obj
```
**get_by_id_or_404**: `get_by_id` ile aynı, ama bulamazsa `NotFoundException` (404) fırlatır.

```python
    def get_all(self, skip, limit, sort_by, order, active_only=True) -> list[ModelType]:
        query = self.db.query(self.model)
        if active_only:
            query = query.filter(self.model.is_active == True)
        sort_column = getattr(self.model, sort_by, None)
        if sort_column is not None:
            query = query.order_by(
                desc(sort_column) if order == "desc" else asc(sort_column)
            )
        return query.offset(skip).limit(limit).all()
```
**get_all**: Tüm kayıtları getirir. `active_only` filtresi, dinamik sıralama (`sort_by` + `order`), sayfalama (`offset` + `limit`) uygular.

```python
    def count(self, active_only: bool = True) -> int:
        query = self.db.query(self.model)
        if active_only:
            query = query.filter(self.model.is_active == True)
        return query.count()
```
**count**: Toplam kayıt sayısını döner. Sayfalama için toplam sayfa hesabında kullanılır.

```python
    def update(self, id: UUID, update_data: dict) -> ModelType:
        db_obj = self.get_by_id_or_404(id)
        for key, value in update_data.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
```
**update**: Kaydı bulur, sadece gönderilen alanları günceller (`setattr`), diğer alanlar korunur (PATCH mantığı).

```python
    def delete(self, id: UUID) -> ModelType:
        db_obj = self.get_by_id_or_404(id)
        db_obj.is_active = False
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
```
**delete (soft)**: Kaydı silmez, `is_active=False` yaparak "silinmiş" olarak işaretler. Veri kaybı olmaz.

```python
    def hard_delete(self, id: UUID) -> None:
        db_obj = self.get_by_id_or_404(id, active_only=False)
        self.db.delete(db_obj)
        self.db.commit()
```
**hard_delete**: Kaydı veritabanından tamamen siler. Geri alınamaz!

---

### `base_service.py`

```python
ModelType = TypeVar("ModelType")
RepoType = TypeVar("RepoType", bound=BaseRepository)
```
İki generic tip: hangi model ve hangi repository ile çalışılacağını belirler.

```python
class BaseService(Generic[ModelType, RepoType]):
    def __init__(self, repo_class: Type[RepoType], db: Session):
        self.db = db
        self.repo: RepoType = repo_class(db)
```
Constructor'da repo sınıfını alır ve instance'ını oluşturur. Her service kendi repo'suna otomatik sahip olur.

```python
    def create(self, data: dict) -> ModelType:
        return self.repo.create(data)
```
**create**: Doğrudan repo'ya yönlendirir. Alt sınıflar override ederek ek validasyon ekleyebilir.

```python
    def get(self, id: UUID) -> ModelType:
        return self.repo.get_by_id_or_404(id)
```
**get**: ID ile kayıt getirir, bulamazsa 404.

```python
    def list(self, filters: FilterParams) -> PaginatedResponse:
        skip = (filters.page - 1) * filters.size
        items = self.repo.get_all(skip=skip, limit=filters.size, ...)
        total = self.repo.count()
        return PaginatedResponse(
            items=items, total=total, page=filters.page,
            size=filters.size,
            pages=math.ceil(total / filters.size) if filters.size > 0 else 0,
        )
```
**list**: Sayfa numarasından `skip` hesaplar (örn: sayfa 3, boyut 20 → skip=40), repo'dan verileri çeker, toplam sayıyı alır ve `PaginatedResponse` formatında döner.

```python
    def update(self, id: UUID, data: dict) -> ModelType:
        update_data = {k: v for k, v in data.items() if v is not None}
        return self.repo.update(id, update_data)
```
**update**: `None` olan alanları filtreler (sadece gönderilen değerler güncellenir), sonra repo'ya yönlendirir.

```python
    def delete(self, id: UUID) -> ModelType:
        return self.repo.delete(id)
```
**delete**: Soft delete — repo'ya yönlendirir.

---

### `enums.py`

```python
class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"
```
**UserRole**: Kullanıcı rolleri. `str`'den de türediği için JSON'da string olarak serialize olur.

```python
class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"           # Taslak
    PENDING = "pending"       # Onay bekliyor
    APPROVED = "approved"     # Onaylandı
    REJECTED = "rejected"     # Reddedildi
    IN_PROGRESS = "in_progress"  # Devam ediyor
    COMPLETED = "completed"   # Tamamlandı
```
**ProjectStatus**: Proje yaşam döngüsü. Akış: `DRAFT → PENDING → APPROVED/REJECTED → IN_PROGRESS → COMPLETED`.

```python
class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
```
**TaskStatus**: Görev durumları. Akış: `TODO → IN_PROGRESS → REVIEW → DONE`.

```python
class ReportStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
```
**ReportStatus**: Rapor durumları. Akış: `DRAFT → SUBMITTED → REVIEWED`.

---

### `exceptions.py`

```python
class AppException(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)
```
**AppException**: Tüm özel hataların base sınıfı. `detail` hata mesajı, `status_code` HTTP kodu.

```python
class NotFoundException(AppException):
    def __init__(self, detail="Kayıt bulunamadı"):
        super().__init__(detail=detail, status_code=404)
```
**404** — Kayıt bulunamadığında fırlatılır.

```python
class BadRequestException(AppException):       # 400 — Geçersiz istek
class UnauthorizedException(AppException):     # 401 — Kimlik doğrulama hatası
class ForbiddenException(AppException):        # 403 — Yetkisiz erişim
class ConflictException(AppException):         # 409 — Çakışma (duplicate kayıt)
```
Her biri kendi HTTP koduna sahip özel hata sınıfları.

---

### `exception_handlers.py`

```python
def register_exception_handlers(app: FastAPI) -> None:
```
Bu fonksiyon `main.py`'da çağrılır ve tüm handler'ları FastAPI'ye kaydeder.

```python
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "status_code": exc.status_code},
        )
```
**AppException handler**: `NotFoundException`, `BadRequestException` vb. fırlatıldığında bu handler yakalar ve standart JSON response döner: `{"detail": "Hata mesajı", "status_code": 404}`.

```python
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        from app.core.config import settings
        detail = "Sunucu hatası oluştu"
        if settings.DEBUG:
            detail = f"Sunucu hatası: {str(exc)}"
        return JSONResponse(status_code=500, content={"detail": detail, ...})
```
**Genel hata handler'ı**: Beklenmeyen hataları yakalar. Debug modda hata detayını gösterir, production'da sadece genel mesaj verir.

---

### `pagination.py`

```python
def apply_sorting(query, model, sort_by, order) -> Query:
    sort_column = getattr(model, sort_by, None)
    if sort_column is None:
        sort_column = getattr(model, "created_at", None)
    if sort_column is not None:
        query = query.order_by(
            desc(sort_column) if order == "desc" else asc(sort_column)
        )
    return query
```
**apply_sorting**: Sorguya dinamik sıralama ekler. `getattr` ile model'den sıralama alanını alır, alan yoksa `created_at`'e fallback yapar.

```python
def apply_pagination(query, page, size) -> Query:
    skip = (page - 1) * size
    return query.offset(skip).limit(size)
```
**apply_pagination**: Sayfa numarasını `offset`'e çevirir (sayfa 2, boyut 20 → offset=20) ve `limit` uygular.

```python
def apply_search(query, model, search, search_fields) -> Query:
    if not search or not search.strip():
        return query
    search_term = f"%{search.strip()}%"
    conditions = []
    for field_name in search_fields:
        column = getattr(model, field_name, None)
        if column is not None:
            conditions.append(column.ilike(search_term))
    if conditions:
        query = query.filter(or_(*conditions))
    return query
```
**apply_search**: Birden fazla alanda OR mantığıyla ILIKE araması yapar. Örneğin `search="Ali"`, `fields=["name","email"]` → `name ILIKE '%Ali%' OR email ILIKE '%Ali%'`.

```python
def build_paginated_response(items, total, params) -> PaginatedResponse:
    return PaginatedResponse(
        items=items, total=total, page=params.page, size=params.size,
        pages=math.ceil(total / params.size) if params.size > 0 else 0,
    )
```
**build_paginated_response**: Sorgu sonuçlarını standart `PaginatedResponse` formatına paketler. `math.ceil` ile toplam sayfa yukarı yuvarlanır.

---

### `validators.py`

```python
def validate_school_email(email: str) -> None:
    email = email.lower().strip()
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise BadRequestException("Geçersiz email formatı")
    if not email.endswith(".edu.tr"):
        raise BadRequestException("Sadece okul mail adresi (.edu.tr) ile kayıt olunabilir")
```
**validate_school_email**: Email'i küçük harfe çevirip trim eder, regex ile format kontrolü yapar, sonra `.edu.tr` ile bitip bitmediğini kontrol eder.

```python
def determine_role_from_email(email: str) -> UserRole:
    email = email.lower().strip()
    if "@ogr." in email:
        return UserRole.STUDENT
    else:
        return UserRole.TEACHER
```
**determine_role_from_email**: Email'de `@ogr.` varsa STUDENT, yoksa TEACHER rolü döner. ADMIN rolü sadece manuel atanır.

```python
def validate_youtube_url(url: str) -> None:
    youtube_pattern = (
        r'^(https?://)?(www\.)?'
        r'(youtube\.com/watch\?v=|youtu\.be/)'
        r'[a-zA-Z0-9_-]{11}'
    )
    if not re.match(youtube_pattern, url.strip()):
        raise BadRequestException("Geçersiz YouTube linki...")
```
**validate_youtube_url**: YouTube URL'inin `youtube.com/watch?v=` veya `youtu.be/` formatında olup olmadığını ve 11 karakterlik video ID'si içerip içermediğini kontrol eder.

---

## 📁 Core (`backend/app/core/`)

---

### `config.py`

```python
class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="postgresql://postgres:postgres@localhost:5432/unitrack")
    SECRET_KEY: str = Field(default="change-this-secret-key-in-production")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    OPENROUTER_API_KEY: str = Field(default="")
    OPENROUTER_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    APP_NAME: str = Field(default="UniTrack AI")
    APP_VERSION: str = Field(default="1.0.0")
    DEBUG: bool = Field(default=True)
    ALLOWED_ORIGINS: str = Field(default="http://localhost:3000,http://localhost:19006")
```
**Settings sınıfı**: Pydantic BaseSettings'den türer. `.env` dosyasından ortam değişkenlerini okur, yoksa varsayılan değerleri kullanır. Her alan tipli ve açıklamalıdır.

```python
    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
```
**allowed_origins_list**: CORS için virgülle ayrılmış string'i listeye çevirir. `"http://a,http://b"` → `["http://a", "http://b"]`.

```python
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }
```
`.env` dosyasını UTF-8 ile okur. `case_sensitive=True` — değişken isimleri büyük/küçük harf duyarlıdır.

```python
settings = Settings()
```
Uygulama genelinde tek bir settings objesi oluşturulur (Singleton pattern).

---

### `database.py`

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)
```
**Engine**: PostgreSQL bağlantı motoru. `pool_pre_ping` her sorgudan önce bağlantının canlı olup olmadığını kontrol eder. `pool_size=10` havuzda 10 bağlantı tutar, `max_overflow=20` gerekirse 20 ekstra açar. `echo=True` debug modunda SQL sorgularını konsola yazdırır.

```python
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
```
**SessionLocal**: Session factory. `autocommit=False` — işlemleri manuel commit ederiz (güvenli). `autoflush=False` — otomatik flush kapalı.

```python
Base = declarative_base()
```
**Base**: Tüm SQLAlchemy modellerinin türediği sınıf. `BaseModel` bunu kullanır.

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
**get_db**: FastAPI dependency. Her API isteğinde yeni session oluşturur, istek bitince (`finally`) session'ı kapatır. `yield` sayesinde istek süresince aynı session kullanılır.

---

### `security.py`

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```
**pwd_context**: Bcrypt hash ayarları. `deprecated="auto"` eski hash algoritmasını otomatik yenisiyle değiştirir.

```python
def hash_password(password: str) -> str:
    return pwd_context.hash(password)
```
**hash_password**: Düz şifreyi bcrypt ile hashler. Aynı şifre her seferinde farklı hash üretir (salt kullanılır).

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```
**verify_password**: Login'de girilen düz şifreyi DB'deki hash ile karşılaştırır. Doğruysa `True`.

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```
**create_access_token**: 15 dakika geçerli JWT token oluşturur. Payload'a `exp` (bitiş zamanı) ve `type: "access"` ekler, gizli anahtarla imzalar.

```python
def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```
**create_refresh_token**: 7 gün geçerli refresh token oluşturur. Access token süresi dolunca yeni token almak için kullanılır.

```python
def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
```
**verify_token**: Token'ı çözer ve doğrular. İmza geçersizse veya süresi dolmuşsa `JWTError` fırlar ve `None` döner.

---

### `dependencies.py`

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
```
**oauth2_scheme**: Swagger UI'daki "Authorize" butonunu bu endpoint'e bağlar. Header'dan `Bearer <token>` okur.

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token)          # 1. Token'ı doğrula
    if payload is None:
        raise credentials_exception
    if payload.get("type") != "access":    # 2. Sadece access token kabul et
        raise credentials_exception
    user_id = payload.get("sub")           # 3. Token'dan user_id çıkar
    if user_id is None:
        raise credentials_exception
    from app.features.auth.auth_model import User
    user = db.query(User).filter(User.id == user_id).first()  # 4. DB'den çek
    if user is None:
        raise credentials_exception
    if not user.is_active:                 # 5. Aktif mi kontrol et
        raise HTTPException(status_code=401, detail="Hesap devre dışı")
    return user
```
**get_current_user**: Korumalı endpoint'lerde kullanılır. Token'dan kullanıcıyı çıkarır, 5 aşamalı kontrol yapar.

```python
def role_required(allowed_roles: list):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Yetkiniz yok")
        return current_user
    return role_checker
```
**role_required**: Dependency factory — fonksiyon döndüren fonksiyon. `role_required([UserRole.ADMIN])` → sadece admin erişebilir. `role_required([UserRole.TEACHER, UserRole.ADMIN])` → öğretmen veya admin erişebilir.

---

## 📁 Auth Feature (`backend/app/features/auth/`)

---

### `auth_model.py`

```python
class User(BaseModel):
    __tablename__ = "users"
```
`users` tablosunu oluşturur. `BaseModel`'den `id`, `created_at`, `updated_at`, `is_active` otomatik gelir.

```python
    email = Column(String(255), unique=True, nullable=False, index=True)
```
**email**: Maks 255 karakter, benzersiz (unique), boş olamaz, index'li (hızlı arama).

```python
    password_hash = Column(String(255), nullable=False)
```
**password_hash**: Bcrypt ile hashlenmiş şifre. Düz şifre asla DB'ye kaydedilmez.

```python
    name = Column(String(150), nullable=False)
```
**name**: Ad soyad, maks 150 karakter.

```python
    role = Column(Enum(UserRole, name="user_role"), nullable=False, default=UserRole.STUDENT, index=True)
```
**role**: PostgreSQL ENUM tipi. Varsayılan STUDENT. Index'li (rol bazlı sorgular hızlı).

```python
    department = Column(String(200), nullable=True)
```
**department**: Bölüm adı, opsiyonel (nullable).

```python
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
```
**__repr__**: Debug/log'larda okunabilir temsil sağlar.

---

### `auth_dto.py`

```python
class RegisterRequest(BaseModel):
    email: EmailStr       # Geçerli email formatı (Pydantic otomatik kontrol)
    password: str = Field(min_length=6)    # Minimum 6 karakter
    name: str = Field(min_length=2, max_length=150)  # 2-150 karakter
    department: Optional[str] = Field(default=None, max_length=200)  # Opsiyonel
```
**RegisterRequest**: Kayıt isteği şeması. `EmailStr` email formatını otomatik doğrular. Tüm validasyonlar Pydantic tarafından yapılır.

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
```
**LoginRequest**: Giriş isteği — sadece email ve şifre.

```python
class TokenResponse(BaseModel):
    access_token: str     # 15 dakika geçerli JWT
    refresh_token: str    # 7 gün geçerli JWT
    token_type: str = "bearer"  # Her zaman "bearer"
```
**TokenResponse**: Login/register/refresh sonrası dönen token çifti.

```python
class RefreshTokenRequest(BaseModel):
    refresh_token: str
```
**RefreshTokenRequest**: Access token süresi dolunca yeni token almak için gönderilen refresh token.

```python
class UserResponse(BaseResponse):
    email: str
    name: str
    role: UserRole
    department: Optional[str] = None
    is_active: bool
```
**UserResponse**: `BaseResponse`'tan `id`, `created_at`, `updated_at` gelir. Şifre hash'i dahil edilmez.

---

### `auth_repo.py`

```python
class AuthRepo(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)
```
**AuthRepo**: `BaseRepository[User]`'dan türer, tüm CRUD işlemleri otomatik gelir.

```python
    def get_by_email(self, email: str) -> User | None:
        return (
            self.db.query(User)
            .filter(User.email == email.lower().strip())
            .filter(User.is_active == True)
            .first()
        )
```
**get_by_email**: Email'i küçük harfe çevirip trim ederek arar. Sadece aktif kullanıcıları döner. Login'de kullanılır.

```python
    def get_by_role(self, role: UserRole) -> list[User]:
        return (
            self.db.query(User)
            .filter(User.role == role)
            .filter(User.is_active == True)
            .all()
        )
```
**get_by_role**: Belirli role sahip tüm aktif kullanıcıları listeler (örn: tüm öğretmenler).

```python
    def email_exists(self, email: str) -> bool:
        user = self.db.query(User).filter(User.email == email.lower().strip()).first()
        return user is not None
```
**email_exists**: Kayıt sırasında email'in zaten kullanılıp kullanılmadığını kontrol eder. Dikkat: burada `is_active` filtresi yok — pasif kullanıcılar da kontrol edilir (aynı email ile tekrar kayıt engellenir).

---

### `auth_manager.py`

```python
def validate_register_data(email: str, repo: AuthRepo) -> UserRole:
    validate_school_email(email)           # 1. Okul maili mi?
    if repo.email_exists(email):           # 2. Daha önce kayıtlı mı?
        raise ConflictException("Bu email adresi zaten kayıtlı")
    role = determine_role_from_email(email) # 3. @ogr. → STUDENT, diğer → TEACHER
    return role
```
**validate_register_data**: Kayıt öncesi 3 aşamalı kontrol. Her aşamada hata fırlatabilir.

```python
def verify_login(email: str, password: str, repo: AuthRepo) -> User:
    user = repo.get_by_email(email)        # 1. Email ile kullanıcıyı bul
    if user is None:
        raise UnauthorizedException("Email veya şifre hatalı")
    if not verify_password(password, user.password_hash):  # 2. Şifre doğru mu?
        raise UnauthorizedException("Email veya şifre hatalı")
    return user
```
**verify_login**: Giriş doğrulama. "Email veya şifre hatalı" mesajı güvenlik için kasıtlı olarak belirsizdir — saldırgana hangi bilginin yanlış olduğunu söylemez.

```python
def validate_refresh_token(token: str) -> str:
    payload = verify_token(token)          # 1. Token geçerli mi?
    if payload is None:
        raise UnauthorizedException("Geçersiz veya süresi dolmuş refresh token")
    if payload.get("type") != "refresh":   # 2. Tipi "refresh" mi?
        raise UnauthorizedException("Geçersiz token tipi")
    user_id = payload.get("sub")           # 3. user_id var mı?
    if user_id is None:
        raise UnauthorizedException("Token'da kullanıcı bilgisi bulunamadı")
    return user_id
```
**validate_refresh_token**: Refresh token'ı 3 aşamada doğrular. Access token ile yenileme yapılmasını engeller (tip kontrolü).

---

### `auth_service.py`

```python
class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AuthRepo(db)
```
Constructor'da DB session alır ve `AuthRepo` instance'ı oluşturur.

```python
    def register(self, data: RegisterRequest) -> TokenResponse:
        role = validate_register_data(data.email, self.repo)  # 1. Validasyon + rol
        hashed_password = hash_password(data.password)         # 2. Şifre hashle
        user_data = {
            "email": data.email.lower().strip(),
            "password_hash": hashed_password,
            "name": data.name, "role": role, "department": data.department,
        }
        user = self.repo.create(user_data)                     # 3. DB'ye kaydet
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),      # 4. Token oluştur
            refresh_token=create_refresh_token(token_data),
        )
```
**register**: Tam kayıt akışı — validasyon, hashleme, DB kaydı, token üretimi. Kayıt başarılıysa kullanıcı otomatik giriş yapmış olur.

```python
    def login(self, data: LoginRequest) -> TokenResponse:
        user = verify_login(data.email, data.password, self.repo)  # 1. Doğrulama
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),          # 2. Token oluştur
            refresh_token=create_refresh_token(token_data),
        )
```
**login**: Email/şifre doğrulama + token üretimi.

```python
    def refresh(self, data: RefreshTokenRequest) -> TokenResponse:
        user_id = validate_refresh_token(data.refresh_token)  # 1. Token doğrula
        user = self.repo.get_by_id(user_id)                   # 2. Kullanıcı aktif mi?
        if user is None or not user.is_active:
            raise NotFoundException("Kullanıcı bulunamadı veya hesap devre dışı")
        token_data = {"sub": str(user.id)}
        return TokenResponse(                                 # 3. Yeni token çifti
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )
```
**refresh**: Sliding expiration — her refresh'te yeni token çifti verilir. Kullanıcının hâlâ aktif olduğu kontrol edilir (hesap silinmişse yeni token verilmez).

```python
    def get_profile(self, user) -> UserResponse:
        return UserResponse.model_validate(user)
```
**get_profile**: User objesini `UserResponse`'a dönüştürür. `model_validate` SQLAlchemy objesinden Pydantic modeline dönüşüm yapar.

---

### `auth_controller.py`

```python
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])
```
Router tanımı — tüm endpoint'ler `/api/v1/auth` altında gruplanır. `tags` Swagger UI'da gruplama için kullanılır.

```python
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.register(data)
```
**POST /api/v1/auth/register**: Yeni kullanıcı kaydı. `RegisterRequest` body'den otomatik parse edilir, `get_db` dependency session sağlar. 201 Created döner.

```python
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.login(data)
```
**POST /api/v1/auth/login**: Kullanıcı girişi. Token çifti döner.

```python
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.refresh(data)
```
**POST /api/v1/auth/refresh**: Token yenileme. Refresh token ile yeni token çifti alınır.

```python
@router.get("/me", response_model=UserResponse)
def get_profile(current_user=Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
```
**GET /api/v1/auth/me**: Giriş yapmış kullanıcının profili. `get_current_user` dependency Bearer token'ı doğrular ve `current_user` objesini sağlar.

---

## 🏗️ Mimari Özet

```
Controller (API endpoint)
    ↓ request alır, response döner — iş mantığı YOK
Service (iş mantığı orkestrasyon)
    ↓ validasyon + iş kuralları — Manager ve Repo'yu koordine eder
Manager (yardımcı validasyon)
    ↓ detaylı kontroller — validators.py ve security.py'ı kullanır
Repository (veri erişim — CRUD)
    ↓ DB sorguları — BaseRepository'den türer
Model (veritabanı tablosu)
    ↓ BaseModel'den türer — tablo yapısını tanımlar
```

Her katman tek bir sorumluluğa sahiptir. Alt katmanlar üst katmandan bağımsızdır.
