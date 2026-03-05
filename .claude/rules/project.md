# 🎯 CLAUDE RULES — UniTrack AI

Kod yazmadan veya değişiklik yapmadan önce bu dokümanı tamamen oku.
Her sorun veya öneri için somut tradeoff'ları açıkla, görüşünü belirt ve yön belirlemeden önce benim onayımı al.

---

## Proje Tanımı

UniTrack AI, üniversite öğrencileri ve öğretmenleri için geliştirilmiş bir **Proje Yönetim Sistemi**dir. Öğrenciler proje oluşturur, öğretmenler onaylar, AI destekli görev dağılımı yapılır, haftalık raporlar ve YouTube video linkleri takip edilir. Gerçek bir üniversite problemi çözmek amacıyla geliştirilmektedir.

### Temel Özellikler
- Okul mail adresi ile kayıt/giriş (rol otomatik atanır)
- Öğrenci proje oluşturur → öğretmen onaylar/reddeder
- AI, proje açıklamasını analiz edip grup üyelerine görev önerir
- Haftalık rapor + YouTube video linki yükleme
- Her öğretmen sadece kendi dersini, her öğrenci sadece sorumlu olduğu dersleri görür
- Rol bazlı yetkilendirme: Student, Teacher, Admin

### Ekstra Özellikler (Faz 3)
- Ders programı takibi
- Yemekhane menüsü
- Sınav takvimi
- Bildirim sistemi

---

## Mühendislik Prensipleri

Bu projedeki tüm önerileri ve kod kararlarını aşağıdaki prensiplere göre şekillendir:

- **Her Koddan Sonra Onay Al** — Her kod değişikliğinden veya yeni oluşturulacak sayfadan sonra onay al ve Her Yaptıgın kodun  mantınığını önemini anlat.
- **DRY zorunludur** — Kod tekrarını agresif şekilde tespit et ve bildir. Her tekrar eden pattern `common/` altında base sınıfa taşınmalı.
- **Test edilmiş kod tartışılmaz** — Az testten iyidir fazla test. Her feature için en az controller ve service testleri yazılmalı.
- **Yeterli mühendislik** — Ne eksik mühendislik (kırılgan, hacky) ne aşırı mühendislik (gereksiz soyutlama, erken optimizasyon). Projenin ihtiyacına uygun çözüm.
- **Edge case'leri düşün** — Hızdan çok düşüncelilik. Hata senaryolarını kapsamlı ele al.
- **Açık kod > akıllı kod** — Karmaşık one-liner yerine okunabilir, açık kod tercih et.
- **Hocanın beklentileri öncelikli** — Katmanlı mimari, package by feature, DRY, CRUD + filtreleme/sıralama/sayfalama zorunlu gereksinimler.

---

## Tech Stack

| Katman       | Teknoloji                    | Açıklama                              |
|--------------|------------------------------|---------------------------------------|
| **Backend**  | FastAPI (Python)             | REST API, katmanlı mimari             |
| **DB**       | PostgreSQL                   | İlişkisel veritabanı                  |
| **ORM**      | SQLAlchemy                   | Model tanımları, DB işlemleri         |
| **Migration**| Alembic                      | DB şema değişiklikleri                |
| **Auth**     | JWT (jose) + bcrypt          | Token bazlı kimlik doğrulama          |
| **AI**       | OpenRouter API               | Çoklu model desteği (GPT, Claude, Gemini, Llama vb.) |
| **Web**      | Next.js (JavaScript)         | App Router, SSR/CSR                   |
| **Mobil**    | React Native (Expo)          | iOS/Android mobil uygulama            |
| **CSS Web**  | Tailwind CSS                 | Utility-first CSS framework           |
| **CSS Mobil**| NativeWind                   | Tailwind syntax'ı React Native'de    |
| **DevOps**   | Docker + docker-compose      | PostgreSQL + FastAPI containerization |
| **Test**     | pytest                       | Feature bazlı unit/integration test   |

---

## Mimari Kurallar

### Klasör Yapısı: Package by Feature
Her feature kendi klasöründe yaşar. Katmanlar feature içinde ayrılır.
Aşağıdaki yapı Faz 1 (MVP) kapsamıdır. Faz 2 ve 3 feature'ları ihtiyaç olduğunda eklenir.

```
backend/
├── app/
│   │
│   ├── core/                                # Merkezi konfigürasyonlar
│   │   ├── __init__.py
│   │   ├── config.py                        # Environment, DB URL, Secret Key, OpenRouter API Key
│   │   ├── database.py                      # SQLAlchemy engine, session, Base
│   │   ├── security.py                      # JWT oluşturma/doğrulama, password hashing
│   │   └── dependencies.py                  # get_db, get_current_user, role_required
│   │
│   ├── common/                              # DRY: Tüm feature'ların kullandığı base sınıflar
│   │   ├── __init__.py
│   │   ├── base_model.py                    # BaseModel (id, created_at, updated_at, is_active)
│   │   ├── base_dto.py                      # BaseResponse, PaginatedResponse, MessageResponse
│   │   ├── base_repo.py                     # BaseRepository (generic CRUD)
│   │   ├── base_service.py                  # BaseService (ortak iş mantığı şablonu)
│   │   ├── pagination.py                    # PaginationParams, filtreleme/sıralama helper
│   │   ├── exceptions.py                    # NotFoundException, ForbiddenException vb.
│   │   ├── exception_handlers.py            # FastAPI global error handler'ları
│   │   ├── enums.py                         # UserRole, ProjectStatus, TaskStatus, ReportStatus
│   │   └── validators.py                    # Email domain kontrolü, ortak validasyonlar
│   │
│   ├── features/                            # ====== PACKAGE BY FEATURE (Faz 1 — MVP) ======
│   │   │
│   │   ├── auth/                            # --- Kimlik Doğrulama ---
│   │   │   ├── __init__.py
│   │   │   ├── auth_model.py                # User entity (id, email, name, role, department, password_hash)
│   │   │   ├── auth_dto.py                  # LoginRequest, RegisterRequest, TokenResponse, UserResponse
│   │   │   ├── auth_repo.py                 # get_by_email, get_by_role (BaseRepo'dan türer)
│   │   │   ├── auth_service.py              # login, register, refresh_token, get_profile
│   │   │   ├── auth_manager.py              # verify_password, validate_school_email, assign_role
│   │   │   └── auth_controller.py           # POST /auth/login, POST /auth/register, GET /auth/me
│   │   │
│   │   ├── user/                            # --- Kullanıcı Yönetimi (Admin) ---
│   │   │   ├── __init__.py
│   │   │   ├── user_dto.py                  # UserListResponse, UserUpdateRequest, UserFilterParams
│   │   │   ├── user_repo.py                 # filter_by_role, filter_by_department, search_by_name
│   │   │   ├── user_service.py              # list_users, update_user, delete_user
│   │   │   ├── user_manager.py              # role_change_validation, bulk_operations
│   │   │   └── user_controller.py           # GET /users, PATCH /users/{id}, DELETE /users/{id}
│   │   │
│   │   ├── project/                         # --- Proje Oluşturma & Yönetimi ---
│   │   │   ├── __init__.py
│   │   │   ├── project_model.py             # Project entity (id, title, description, course_id, status, created_by)
│   │   │   ├── project_dto.py               # ProjectCreate, ProjectUpdate, ProjectResponse, ProjectFilterParams
│   │   │   ├── project_repo.py              # get_by_course, get_by_status, get_by_member
│   │   │   ├── project_service.py           # create_project, submit_for_approval, approve/reject
│   │   │   ├── project_manager.py           # status_transition_validation, member_limit_check
│   │   │   └── project_controller.py        # CRUD /projects, POST /projects/{id}/approve
│   │   │
│   │   ├── project_member/                  # --- Proje Grup Üyeleri ---
│   │   │   ├── __init__.py
│   │   │   ├── project_member_model.py      # ProjectMember entity (project_id, user_id, role_in_project)
│   │   │   ├── project_member_dto.py        # AddMemberRequest, MemberResponse
│   │   │   ├── project_member_repo.py       # get_members_by_project, get_projects_by_user
│   │   │   ├── project_member_service.py    # add_member, remove_member, change_role
│   │   │   ├── project_member_manager.py    # duplicate_member_check, max_member_check
│   │   │   └── project_member_controller.py # /projects/{id}/members
│   │   │
│   │   ├── task/                            # --- Görev Yönetimi ---
│   │   │   ├── __init__.py
│   │   │   ├── task_model.py                # Task entity (id, project_id, assigned_to, title, description, status, deadline)
│   │   │   ├── task_dto.py                  # TaskCreate, TaskUpdate, TaskResponse, TaskFilterParams
│   │   │   ├── task_repo.py                 # get_by_project, get_by_user, get_by_status, get_overdue
│   │   │   ├── task_service.py              # create_task, assign_task, update_status
│   │   │   ├── task_manager.py              # deadline_validation, status_transition, workload_check
│   │   │   └── task_controller.py           # CRUD /tasks, PATCH /tasks/{id}/status
│   │   │
│   │   ├── report/                          # --- Haftalık Rapor & Video ---
│   │   │   ├── __init__.py
│   │   │   ├── report_model.py              # Report entity (id, project_id, week_number, content, youtube_link, file_url, submitted_by)
│   │   │   ├── report_dto.py                # ReportCreate, ReportUpdate, ReportResponse, ReportFilterParams
│   │   │   ├── report_repo.py               # get_by_project, get_by_week, get_by_student
│   │   │   ├── report_service.py            # submit_report, update_report, list_reports
│   │   │   ├── report_manager.py            # week_validation, duplicate_week_check, youtube_url_validation
│   │   │   └── report_controller.py         # CRUD /reports
│   │   │
│   │   └── ai/                              # --- AI Görev Dağılımı ---
│   │       ├── __init__.py
│   │       ├── ai_dto.py                    # AiTaskRequest, AiTaskResponse, ModelSelectRequest
│   │       ├── ai_service.py                # OpenRouter API çağrısı, model routing
│   │       ├── ai_manager.py                # prompt_builder, response_parser, token_limiter
│   │       ├── ai_prompts.py                # AI prompt şablonları (DRY)
│   │       ├── ai_config.py                 # Desteklenen modeller listesi, varsayılan model, model ayarları
│   │       └── ai_controller.py             # POST /ai/suggest-tasks, GET /ai/models
│   │
│   │   # ══════════════════════════════════════════════════════════════
│   │   # Faz 2'de eklenecek: course/, enrollment/
│   │   # Faz 3'te eklenecek: notification/, campus/
│   │   # Bu klasörler şimdi OLUŞTURULMAYACAK, ihtiyaç olunca eklenir.
│   │   # ══════════════════════════════════════════════════════════════
│   │
│   └── main.py                              # FastAPI app, router dahil etme, exception handler
│
├── alembic/                                 # DB migration'ları
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
│
├── tests/                                   # Test dosyaları (feature bazlı)
│   ├── __init__.py
│   ├── conftest.py                          # Test DB, fixtures, test client
│   ├── test_auth/
│   │   ├── test_auth_controller.py
│   │   └── test_auth_service.py
│   ├── test_project/
│   │   ├── test_project_controller.py
│   │   └── test_project_service.py
│   ├── test_task/
│   ├── test_report/
│   └── test_ai/
│
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml                       # PostgreSQL + FastAPI
└── README.md
```

### Katman Sırası (Her Feature İçin)
```
Controller → Service → Manager → Repository → Model
                                                ↕
                                              DTO (Schema)
```

| Katman         | Dosya Adı              | Görevi                                           |
|----------------|------------------------|--------------------------------------------------|
| **Model**      | `{feature}_model.py`   | SQLAlchemy entity, DB tablo tanımı               |
| **DTO**        | `{feature}_dto.py`     | Pydantic schema, request/response validasyonu    |
| **Repository** | `{feature}_repo.py`    | DB CRUD sorguları, BaseRepo'dan türer            |
| **Service**    | `{feature}_service.py` | Ana iş mantığı, orkestrasyon                     |
| **Manager**    | `{feature}_manager.py` | Validasyon, yardımcı işlemler, dış servis çağrı  |
| **Controller** | `{feature}_controller.py` | FastAPI endpoint tanımları, request/response   |

### Dosya İsimlendirme Kuralı
- Her dosya **feature prefix'i** ile başlar: `auth_model.py`, `project_dto.py`, `task_repo.py`
- Bu kural zorunludur. `model.py`, `service.py` gibi generic isimler **YASAKTIR**

---

## Kod Review Kuralları

Her kod değişikliğinde aşağıdaki 4 alanı sırasıyla değerlendir. Her alanda tespit ettiğin sorun için somut açıklama, dosya/satır referansı ve çözüm önerisi sun. Yön belirlemeden önce onayımı al.

### 1. Mimari Review
- Sistem tasarımı ve feature sınırları doğru mu?
- Feature'lar arası bağımlılık (coupling) minimum mu?
- Veri akışı: Controller → Service → Manager → Repo → Model sırası korunuyor mu?
- Güvenlik: Auth, rol kontrolü, API sınırları doğru mu?
- Ölçeklenebilirlik: Tek darboğaz noktası (single point of failure) var mı?

### 2. Kod Kalitesi Review
- Kod organizasyonu package by feature'a uyuyor mu?
- DRY ihlalleri — agresif şekilde tespit et. Tekrar eden pattern varsa `common/` altına base sınıf öner.
- Hata yönetimi: try-except pattern'leri doğru mu, kaçırılan edge case var mı? (açıkça belirt)
- Teknik borç biriken noktalar var mı?
- Eksik veya aşırı mühendislik yapılmış alanlar var mı?

### 3. Test Review
- Test kapsamı yeterli mi? (unit, integration, e2e)
- Test kalitesi ve assertion'lar güçlü mü?
- Kaçırılan edge case'ler — kapsamlı düşün.
- Test edilmemiş hata senaryoları ve error path'ler var mı?

### 4. Performans Review
- N+1 N+N  query problemi var mı? DB erişim pattern'leri optimize mi?
- Bellek kullanımı endişesi var mı?
- Caching fırsatları var mı?
- Yavaş veya yüksek karmaşıklıkta kod yolları var mı?

### Tespit Edilen Her Sorun İçin
- Problemi somut şekilde açıkla (dosya ve satır referansı ile)
- 2-3 seçenek sun ("hiçbir şey yapma" dahil, mantıklıysa)
- Her seçenek için belirt: uygulama eforu, risk, diğer koda etkisi, bakım yükü
- Önerilen seçeneği ve nedenini söyle (yukarıdaki mühendislik prensiplerine göre)
- Onayımı al, sonra devam et

### Değişiklik Boyutuna Göre Yaklaşım
- **BÜYÜK DEĞİŞİKLİK:** Mimari → Kod Kalitesi → Test → Performans sırasıyla, her bölümde en fazla 4 sorun
- **KÜÇÜK DEĞİŞİKLİK:** Her review bölümünden 1 soru ile hızlıca geç

---

## DRY Kuralları

### Base Sınıflar (common/ altında)
Her feature bu base sınıflardan türemeli, tekrar kod yazılmamalı:

| Base Sınıf        | İçeriği                                                    |
|--------------------|------------------------------------------------------------|
| `base_model.py`    | id (UUID), created_at, updated_at, is_active (soft delete) |
| `base_dto.py`      | BaseResponse, PaginatedResponse, MessageResponse, FilterParams |
| `base_repo.py`     | create, get_by_id, get_all, update, delete, hard_delete, count |
| `base_service.py`  | create, get, list, update, delete (generic CRUD)           |
| `pagination.py`    | apply_filters, apply_sorting, apply_pagination             |
| `exceptions.py`    | AppException, NotFoundException, ForbiddenException vb.    |
| `enums.py`         | UserRole, ProjectStatus, TaskStatus, ReportStatus          |
| `validators.py`    | Email domain kontrolü, ortak validasyonlar                 |

### DRY Kontrol Listesi
- Yeni feature eklerken base_repo'dan türet, CRUD'u tekrar yazma
- Pagination her listede `pagination.py`'dan gelsin
- Exception'lar her yerde `exceptions.py`'dan fırlatılsın
- Enum'lar hardcoded string yerine `enums.py`'dan kullanılsın
- 2 veya daha fazla yerde aynı kod varsa → `common/` altına taşı
- Frontend'de `apiClient`, `useFetch`, `usePagination` hook'ları DRY için zorunlu

---

## Geliştirme Fazları

### Faz 1 — MVP (Öncelik)
| Feature          | Açıklama                                    |
|------------------|---------------------------------------------|
| `auth`           | Kayıt, giriş, JWT, okul mail validasyonu    |
| `user`           | Kullanıcı CRUD, rol yönetimi, listeleme     |
| `project`        | Proje oluşturma, onay/red mekanizması       |
| `project_member` | Grup üyesi ekleme/çıkarma                   |
| `task`           | Görev oluşturma, atama, durum takibi        |
| `report`         | Haftalık rapor, YouTube link yükleme        |
| `ai`             | OpenRouter API ile görev dağılımı, model seçimi |

### Faz 2 — Ders Sistemi
| Feature      | Açıklama                                 |
|--------------|------------------------------------------|
| `course`     | Ders oluşturma, öğretmen-ders ilişkisi   |
| `enrollment` | Öğrenci-ders kaydı, listeleme            |

### Faz 3 — Ekstralar
| Feature        | Açıklama                               |
|----------------|----------------------------------------|
| `notification` | Bildirim sistemi (in-app / email)      |
| `campus`       | Yemekhane, ders programı, sınav takvimi|

---

## Roller & Yetkiler

### Rol Atama Kuralı
- `@ogr.` içeren mail → **STUDENT**
- Manuel atama → **TEACHER**
- Manuel atama → **ADMIN**

### Yetki Matrisi
| İşlem                          | Student | Teacher | Admin |
|--------------------------------|:-------:|:-------:|:-----:|
| Kayıt / Giriş                 |    ✅   |    ✅   |   ✅  |
| Proje oluşturma                |    ✅   |    ✅   |   ✅  |
| Proje onaylama/reddetme        |    ❌   |    ✅   |   ✅  |
| Görev oluşturma/düzenleme      |    ✅   |    ❌   |   ✅  |
| Rapor yükleme                  |    ✅   |    ❌   |   ✅  |
| Tüm raporları görüntüleme      |    ❌   |    ✅   |   ✅  |
| AI görev önerisi               |    ✅   |    ✅   |   ✅  |
| Kullanıcı listeleme            |    ❌   |    ✅   |   ✅  |
| Kullanıcı silme                |    ❌   |    ❌   |   ✅  |
| Ders oluşturma                 |    ❌   |    ✅   |   ✅  |

---

## DB Modelleri

### users
| Alan          | Tip       | Açıklama                    |
|---------------|-----------|-----------------------------|
| id            | UUID      | Primary key                 |
| email         | String    | Unique, okul maili          |
| password_hash | String    | Bcrypt hash                 |
| name          | String    | Ad soyad                    |
| role          | Enum      | STUDENT / TEACHER / ADMIN   |
| department    | String    | Bölüm                       |
| is_active     | Boolean   | Soft delete                 |
| created_at    | DateTime  | Oluşturma tarihi            |
| updated_at    | DateTime  | Güncelleme tarihi           |

### projects
| Alan          | Tip       | Açıklama                    |
|---------------|-----------|-----------------------------|
| id            | UUID      | Primary key                 |
| title         | String    | Proje başlığı               |
| description   | Text      | Proje açıklaması            |
| course_id     | UUID      | FK → courses (Faz 2)        |
| status        | Enum      | DRAFT → PENDING → APPROVED / REJECTED → IN_PROGRESS → COMPLETED |
| created_by    | UUID      | FK → users                  |
| ai_task_plan  | JSON      | AI'ın önerdiği görev planı  |
| created_at    | DateTime  |                             |
| updated_at    | DateTime  |                             |

### project_members
| Alan            | Tip     | Açıklama                  |
|-----------------|---------|---------------------------|
| id              | UUID    | Primary key               |
| project_id      | UUID    | FK → projects             |
| user_id         | UUID    | FK → users                |
| role_in_project | String  | Lider, geliştirici vb.    |
| joined_at       | DateTime|                           |

### tasks
| Alan          | Tip       | Açıklama                    |
|---------------|-----------|-----------------------------|
| id            | UUID      | Primary key                 |
| project_id    | UUID      | FK → projects               |
| assigned_to   | UUID      | FK → users                  |
| title         | String    | Görev başlığı               |
| description   | Text      | Görev detayı                |
| status        | Enum      | TODO / IN_PROGRESS / REVIEW / DONE |
| week_number   | Integer   | Hangi hafta (1-14)          |
| deadline      | DateTime  | Son tarih                   |
| created_at    | DateTime  |                             |
| updated_at    | DateTime  |                             |

### reports
| Alan          | Tip       | Açıklama                    |
|---------------|-----------|-----------------------------|
| id            | UUID      | Primary key                 |
| project_id    | UUID      | FK → projects               |
| submitted_by  | UUID      | FK → users                  |
| week_number   | Integer   | Hangi hafta                 |
| content       | Text      | Rapor içeriği               |
| youtube_link  | String    | YouTube video linki         |
| file_url      | String    | Ek dosya (opsiyonel)        |
| status        | Enum      | DRAFT / SUBMITTED / REVIEWED|
| created_at    | DateTime  |                             |
| updated_at    | DateTime  |                             |

### Faz 2 Modelleri

**courses:** id, name, code, teacher_id (FK → users), semester, department, created_at, updated_at

**enrollments:** id, user_id (FK → users), course_id (FK → courses), enrolled_at

### Faz 3 Modelleri

**notifications:** id, user_id, title, message, is_read, type, created_at

**meal_menus:** id, date, meal_type, items, created_at

**exam_schedules:** id, course_id, exam_date, location, type, created_at

**class_schedules:** id, course_id, day_of_week, start_time, end_time, classroom, created_at

---

## API Endpoint'leri

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

### Users
```
GET    /api/v1/users
GET    /api/v1/users/{id}
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

### Projects
```
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/{id}
PATCH  /api/v1/projects/{id}
DELETE /api/v1/projects/{id}
POST   /api/v1/projects/{id}/approve
POST   /api/v1/projects/{id}/reject
```

### Project Members
```
POST   /api/v1/projects/{id}/members
DELETE /api/v1/projects/{id}/members/{user_id}
GET    /api/v1/projects/{id}/members
```

### Tasks
```
POST   /api/v1/tasks
GET    /api/v1/tasks
GET    /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}
DELETE /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}/status
```

### Reports
```
POST   /api/v1/reports
GET    /api/v1/reports
GET    /api/v1/reports/{id}
PATCH  /api/v1/reports/{id}
DELETE /api/v1/reports/{id}
```

### AI
```
POST   /api/v1/ai/suggest-tasks
GET    /api/v1/ai/models
```

---

## Kod Yazım Kuralları

### Python / Backend
- **Dil:** Python 3.11+
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0 (async opsiyonel)
- **Validation:** Pydantic v2
- **Linting:** Ruff veya Black
- Type hint kullan, her fonksiyona docstring yaz
- Her endpoint response_model belirt
- Hardcoded değer yasak, .env veya enums.py kullan
- Her DB işlemi try-except ile sarılmalı
- Her feature'da CRUD + listeleme + filtreleme + sıralama + sayfalama + kısmi güncelleme zorunlu

### JavaScript / Frontend (Web)
- **Framework:** Next.js (App Router)
- **Stil:** Tailwind CSS
- **State:** React hooks (useState, useEffect, useContext)
- **HTTP:** fetch veya axios ile apiClient wrapper (DRY)
- TypeScript kullanılmayacak, JavaScript ile yazılacak
- Component isimleri PascalCase: `ProjectCard.jsx`
- Hook isimleri camelCase: `useProjects.js`
- API çağrıları `features/{feature}/api.js` içinde

### JavaScript / Frontend (Mobil)
- **Framework:** React Native + Expo (Expo Router)
- **Stil:** NativeWind (Tailwind syntax)
- Web ile aynı `features/` yapısı kullanılacak
- Aynı API client mantığı (DRY)

---

## İş Akışı ve Etkileşim Kuralları

- Zaman çizelgesi veya ölçek konusunda varsayımda bulunma, sor.
- Her review bölümünden sonra dur, geri bildirimimi bekle.
- Sorunları numaralandır, seçenekleri harflendir.
- Önerilen seçenek her zaman ilk sırada olsun.
- Büyük değişiklik yapılacaksa bölüm bölüm ilerle, her bölümde en fazla 4 sorun.
- Küçük değişikliklerde her bölümden 1 soru ile hızlıca geç.

---

## Önemli Notlar

- Backend `localhost:8000`, Web `localhost:3000`, Mobil Expo dev server'da çalışır
- CORS ayarı FastAPI tarafında açılmalı
- `.env` dosyası git'e eklenmemeli, `.env.example` paylaşılmalı
- Her feature bağımsız çalışabilmeli, feature'lar arası bağımlılık minimum olmalı
- Yeni feature eklerken: klasör oluştur → base'den türet → router'ı main.py'a ekle
- Commit mesajları: `feat(auth): add login endpoint`, `fix(task): status transition bug`