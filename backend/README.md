# 🎓 UniTrack AI — Backend

UniTrack AI, üniversite öğrencileri ve öğretmenleri için geliştirilmiş bir **Proje Yönetim Sistemi**dir. Bu doküman, backend tarafının mevcut durumunu ve her dosyanın ne işe yaradığını açıklar.

---

## 🛠 Tech Stack

| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| Python | 3.11+ | Backend dili |
| FastAPI | 0.115.6 | REST API framework |
| PostgreSQL | 15 | İlişkisel veritabanı |
| SQLAlchemy | 2.0.36 | ORM (Object-Relational Mapping) |
| Alembic | 1.14.1 | DB migration (şema değişiklikleri) |
| Pydantic | 2.10.4 | Veri validasyonu ve şema tanımları |
| JWT (python-jose) | 3.3.0 | Token bazlı kimlik doğrulama |
| bcrypt (passlib) | 1.7.4 | Şifre hashleme |
| Docker | — | Container ortamı |
| pytest | 8.3.4 | Test framework |

---

## 📁 Proje Yapısı

```
backend/
├── app/
│   ├── __init__.py
│   │
│   ├── core/                         # 🔧 Merkezi konfigürasyonlar
│   │   ├── config.py                 # Ortam değişkenleri (.env okuma)
│   │   ├── database.py               # SQLAlchemy bağlantı yönetimi
│   │   ├── security.py               # JWT token + bcrypt şifre işlemleri
│   │   └── dependencies.py           # FastAPI dependency'leri (auth, rol kontrolü)
│   │
│   ├── common/                       # 🔁 DRY: Ortak base sınıflar
│   │   ├── enums.py                  # Sabit değerler (UserRole, ProjectStatus vb.)
│   │   ├── exceptions.py             # Özel hata sınıfları (404, 400, 401, 403, 409)
│   │   ├── exception_handlers.py     # Global hata yakalayıcı
│   │   ├── validators.py             # Email, YouTube URL validasyonları
│   │   ├── base_model.py             # Tüm DB modellerinin base'i (id, tarihler, soft delete)
│   │   ├── base_dto.py               # Response/Request şema base'leri
│   │   ├── base_repo.py              # Generic CRUD repository
│   │   ├── base_service.py           # Generic service şablonu
│   │   └── pagination.py             # Sıralama, sayfalama, arama helper'ları
│   │
│   ├── features/                     # 📦 Feature modülleri (Package by Feature)
│   │   ├── auth/                     # ✅ Kimlik doğrulama (TAMAMLANDI)
│   │   │   ├── auth_model.py         # User tablosu
│   │   │   ├── auth_dto.py           # Request/Response şemaları
│   │   │   ├── auth_repo.py          # DB sorguları
│   │   │   ├── auth_manager.py       # Validasyon mantığı
│   │   │   ├── auth_service.py       # İş akışı orkestrasyon
│   │   │   └── auth_controller.py    # API endpoint'leri
│   │   │
│   │   ├── user/                     # ⬜ Kullanıcı yönetimi (SIRADA)
│   │   ├── project/                  # ⬜ Proje yönetimi
│   │   ├── project_member/           # ⬜ Grup üyeleri
│   │   ├── task/                     # ⬜ Görev yönetimi
│   │   ├── report/                   # ⬜ Haftalık rapor
│   │   └── ai/                       # ⬜ AI görev dağılımı
│   │
│   └── main.py                       # ⬜ FastAPI giriş noktası (henüz oluşturulmadı)
│
├── alembic/                          # DB migration dosyaları
├── tests/                            # Test dosyaları (feature bazlı)
├── requirements.txt                  # Python bağımlılıkları
├── .env.example                      # Ortam değişkenleri şablonu
├── Dockerfile                        # Docker image tanımı
└── docker-compose.yml                # PostgreSQL + FastAPI container'ları
```

---

## 🔧 Core Modül Detayları (`app/core/`)

### `config.py` — Uygulama Ayarları
`.env` dosyasından ortam değişkenlerini okur ve tip güvenliği sağlar (Pydantic Settings).

**Önemli ayarlar:**
- `DATABASE_URL` → PostgreSQL bağlantı adresi
- `SECRET_KEY` → JWT imzalama anahtarı
- `ACCESS_TOKEN_EXPIRE_MINUTES = 15` → Sliding expiration (15dk inaktivitede oturum kapanır)
- `REFRESH_TOKEN_EXPIRE_DAYS = 7` → 7 gün boyunca tekrar login gerekmez
- `ALLOWED_ORIGINS` → CORS izin listesi (frontend adresleri)

### `database.py` — Veritabanı Bağlantısı
- **Engine:** PostgreSQL connection pool (10 bağlantı + 20 overflow)
- **SessionLocal:** Her API isteğinde yeni DB oturumu üretir
- **Base:** Tüm modeller buradan türer
- **`get_db()`:** FastAPI dependency — istek gelince session verir, bitince kapatır

### `security.py` — JWT ve Şifre Güvenliği
- `hash_password()` → bcrypt ile şifre hashleme (her seferinde farklı hash — salt)
- `verify_password()` → Login'de şifre doğrulama
- `create_access_token()` → 15dk geçerli JWT (payload: `sub=user_id, type=access`)
- `create_refresh_token()` → 7 gün geçerli JWT (payload: `sub=user_id, type=refresh`)
- `verify_token()` → Token çözme ve doğrulama

### `dependencies.py` — FastAPI Dependency'leri
- **`get_current_user()`** → Token'dan aktif kullanıcıyı çıkarır (5 katmanlı kontrol):
  1. Token geçerli mi?
  2. Token tipi "access" mi?
  3. User ID var mı?
  4. Kullanıcı DB'de var mı?
  5. Kullanıcı aktif mi?
- **`role_required(roles)`** → Rol bazlı erişim kısıtlaması (factory pattern)

---

## 🔁 Common Modül Detayları (`app/common/`)

### `enums.py` — Sabit Değerler
| Enum | Değerler |
|------|----------|
| `UserRole` | STUDENT, TEACHER, ADMIN |
| `ProjectStatus` | DRAFT → PENDING → APPROVED/REJECTED → IN_PROGRESS → COMPLETED |
| `TaskStatus` | TODO → IN_PROGRESS → REVIEW → DONE |
| `ReportStatus` | DRAFT → SUBMITTED → REVIEWED |

### `exceptions.py` — Özel Hata Sınıfları
| Sınıf | HTTP Kodu | Kullanım |
|-------|-----------|----------|
| `NotFoundException` | 404 | Kayıt bulunamadı |
| `BadRequestException` | 400 | Geçersiz istek |
| `UnauthorizedException` | 401 | Kimlik doğrulama hatası |
| `ForbiddenException` | 403 | Yetkisiz erişim |
| `ConflictException` | 409 | Çakışma (duplicate) |

### `exception_handlers.py` — Global Hata Yakalayıcı
Tüm `AppException`'ları standart JSON formatında döner. Beklenmeyen hatalar için 500 handler'ı (debug'da detay gösterir, production'da gizler).

### `validators.py` — Ortak Validasyonlar
- `validate_school_email()` → `.edu.tr` kontrolü
- `determine_role_from_email()` → `@ogr.` → STUDENT, diğer → TEACHER
- `validate_youtube_url()` → YouTube link format doğrulama

### `base_model.py` — DB Model Base Sınıfı
Tüm modellere otomatik eklenen alanlar:
- `id` (UUID) — Benzersiz kimlik
- `created_at` — Oluşturma tarihi
- `updated_at` — Son güncelleme tarihi
- `is_active` — Soft delete flag'i

### `base_dto.py` — Response/Request Base Sınıfları
- `BaseResponse` → id, created_at, updated_at (`from_attributes=True`)
- `PaginatedResponse[T]` → Generic sayfalanmış liste (items, total, page, size, pages)
- `MessageResponse` → Basit mesaj response'u
- `FilterParams` → Sayfalama/sıralama parametreleri (page, size, sort_by, order, search)

### `base_repo.py` — Generic CRUD Repository
7 fonksiyon — her feature bu sınıftan türeyerek CRUD kodunu tekrar yazmaz:
- `create()`, `get_by_id()`, `get_by_id_or_404()`, `get_all()`, `count()`, `update()`, `delete()`, `hard_delete()`

### `base_service.py` — Generic Service Şablonu
Repository'nin üstünde iş mantığı katmanı:
- `create()`, `get()`, `list()` (PaginatedResponse döner), `update()` (PATCH — None filtreler), `delete()`

### `pagination.py` — Sayfalama Helper'ları
- `apply_sorting()` → Dinamik sıralama
- `apply_pagination()` → Offset/limit
- `apply_search()` → ILIKE + OR mantığıyla çoklu alan arama
- `build_paginated_response()` → Standart formata dönüştürme

---

## 🔐 Auth Feature Detayları (`app/features/auth/`)

### Mimari Akış
```
Controller → Service → Manager → Repository → Model
                                                 ↕
                                               DTO (Schema)
```

### `auth_model.py` — User Tablosu (`users`)
| Alan | Tip | Açıklama |
|------|-----|----------|
| email | String(255) | Unique, indexed — okul maili |
| password_hash | String(255) | Bcrypt hash |
| name | String(150) | Ad soyad |
| role | Enum | STUDENT / TEACHER / ADMIN |
| department | String(200) | Bölüm (opsiyonel) |
| + BaseModel | — | id, created_at, updated_at, is_active |

### `auth_dto.py` — Request/Response Şemaları
| Şema | İşlevi |
|------|--------|
| `RegisterRequest` | email (EmailStr), password (min 6), name, department |
| `LoginRequest` | email, password |
| `TokenResponse` | access_token, refresh_token, token_type |
| `RefreshTokenRequest` | refresh_token |
| `UserResponse` | Kullanıcı bilgileri (şifre HARİÇ) |

### `auth_repo.py` — DB Sorguları
BaseRepository[User]'dan türer (CRUD otomatik). Ek sorgular:
- `get_by_email()` → Login için
- `get_by_role()` → Rol bazlı filtreleme
- `email_exists()` → Duplicate kontrolü

### `auth_manager.py` — Validasyon Mantığı
- `validate_register_data()` → Okul maili + duplicate + otomatik rol belirleme
- `verify_login()` → Email/şifre/aktiflik doğrulama
- `validate_refresh_token()` → Token geçerlilik + tip kontrolü

### `auth_service.py` — İş Akışı Orkestrasyon
- `register()` → Validasyon → hash → DB kayıt → token döner
- `login()` → Doğrulama → token döner
- `refresh()` → Refresh token → aktiflik kontrol → yeni token çifti
- `get_profile()` → User → UserResponse dönüşümü

### `auth_controller.py` — API Endpoint'leri
| Endpoint | Method | İşlevi |
|----------|--------|--------|
| `/api/v1/auth/register` | POST | Yeni kayıt (201) |
| `/api/v1/auth/login` | POST | Giriş |
| `/api/v1/auth/refresh` | POST | Token yenileme |
| `/api/v1/auth/me` | GET | Profil bilgisi |

---

## 🔑 Oturum Yönetimi (Sliding Expiration)

```
Kullanıcı login olur → Access Token (15dk) + Refresh Token (7 gün)
                                    ↓
                    Kullanıcı aktif olduğu sürece
                    frontend otomatik olarak token yeniler
                                    ↓
                    15dk inaktivite → Access Token dolar
                    → Refresh Token ile yeni token alınır
                                    ↓
                    7 gün sonra → Refresh Token da dolar
                    → Kullanıcı tekrar login olmalı
```

---

## 🐳 Docker ile Çalıştırma

```bash
# Tüm servisleri başlat (PostgreSQL + FastAPI + MinIO)
docker-compose up --build

# Arka planda çalıştır
docker-compose up -d --build

# Logları görüntüle
docker-compose logs -f api

# Servisleri durdur
docker-compose down
```

**Portlar:**
- PostgreSQL: `localhost:5432`
- FastAPI: `localhost:19000`
- Swagger UI: `localhost:19000/docs`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`

---

## ⚙️ Lokal Geliştirme

```bash
# 1. Virtual environment oluştur
cd backend
python -m venv venv

# 2. Aktifleştir
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. Bağımlılıkları yükle
pip install -r requirements.txt

# 4. .env dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenle (SECRET_KEY, DATABASE_URL vb.)

# 5. Uygulamayı başlat
uvicorn app.main:app --reload --port 8000
```

---

## 📊 Mevcut İlerleme Durumu

| Adım | Durum | Açıklama |
|------|-------|----------|
| Proje İskeleti | ✅ | Klasörler, __init__.py dosyaları |
| Konfigürasyon | ✅ | .gitignore, requirements.txt, .env.example, Docker |
| Core Modül | ✅ | config, database, security, dependencies, storage |
| Common Modül | ✅ | 12 ortak dosya (enums, exceptions, validators, base sınıflar, helper'lar) |
| Auth Feature | ✅ | Kayıt, giriş, JWT, okul mail validasyonu, profil |
| User Feature | ✅ | Kullanıcı CRUD, rol yönetimi, filtreleme, listeleme |
| Project Feature | ✅ | Proje oluşturma, onay/red, durum yönetimi |
| Project Member | ✅ | Grup üyesi ekleme/çıkarma, davet, rol yönetimi |
| Task Feature | ✅ | Görev oluşturma, atama, durum takibi |
| Report Feature | ✅ | Haftalık rapor, YouTube link, dosya yükleme |
| AI Feature | ✅ | OpenRouter API, çoklu model desteği, görev önerisi |
| Course Feature | ✅ | Ders oluşturma, öğrenci kaydı, listeleme |
| Notification | ✅ | Bildirim sistemi (in-app) |
| File Feature | ✅ | MinIO ile dosya yükleme/indirme |
| Admin Feature | ✅ | Admin paneli, istatistikler, kullanıcı yönetimi |
| Department | ✅ | Bölüm yönetimi |
| Activity Log | ✅ | Aktivite kayıtları |
| Project Category | ✅ | Proje kategorileri |
| Student Prefix | ✅ | Öğrenci ön ek yönetimi |
| main.py | ✅ | 15 router kayıtlı, CORS, exception handler |
| Alembic Migration | ✅ | DB şema yönetimi |
| Test Altyapısı | ✅ | 9 feature için test dizinleri (conftest.py + feature bazlı testler) |
