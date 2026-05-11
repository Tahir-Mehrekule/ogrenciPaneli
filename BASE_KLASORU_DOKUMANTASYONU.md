# 🏗️ Base Klasörü — Detaylı Dokümantasyon

## Base Klasörünün Amacı

`base/` klasörü, projedeki **tüm feature'ların ortak atasıdır**. DRY (Don't Repeat Yourself) prensibi ile her feature'da tekrar tekrar yazılması gereken CRUD operasyonlarını, model alanlarını, DTO şemalarını ve iş mantığı temellerini **tek bir yere** toplar.

Bir benzetme yaparsak: `base/` klasörü bir **fabrika kalıbıdır**. Her feature (auth, course, project, task, report vb.) bu kalıptan türeyerek kendi özel işlevlerini ekler ama temel CRUD, model yapısı ve DTO'lar zaten hazır gelir.

---

## 📁 Dosya Yapısı

```
backend/app/base/
├── __init__.py          → Paket tanımı ve dışa açılan sınıflar
├── base_model.py        → Veritabanı model base sınıfları
├── base_dto.py          → API istek/yanıt şema base sınıfları
├── base_repo.py         → Veritabanı CRUD işlemleri base sınıfı
├── base_service.py      → İş mantığı katmanı base sınıfı
└── base_manager.py      → Validasyon/yardımcı işlemler base sınıfı
```

---

## 📄 1. `__init__.py` — Paket Giriş Noktası

### Amacı
Base klasöründeki tüm sınıfları tek bir yerden import edilebilir hale getirir.

### Kodun İşlevi
```python
from app.base.base_model import BaseModel, NamedBaseModel
from app.base.base_dto import BaseResponse, PaginatedResponse, FilterParams, MessageResponse
from app.base.base_repo import BaseRepository
from app.base.base_service import BaseService
from app.base.base_manager import BaseManager
```

Bu sayede herhangi bir feature dosyasında:
```python
# Uzun yol (bu dosya olmasaydı):
from app.base.base_repo import BaseRepository

# Kısa yol (__init__.py sayesinde):
from app.base import BaseRepository
```

### `__all__` Listesi
Dışarıya açılan 9 sınıf: `BaseModel`, `NamedBaseModel`, `BaseResponse`, `PaginatedResponse`, `FilterParams`, `MessageResponse`, `BaseRepository`, `BaseService`, `BaseManager`

---

## 📄 2. `base_model.py` — Veritabanı Model Base Sınıfları

### Amacı
Tüm SQLAlchemy modellerinin ortak alanlarını tanımlar. Her tablo bu sınıftan türer ve otomatik olarak `id`, `created_at`, `updated_at`, `is_active`, `is_deleted` alanlarına sahip olur.

### İçerdiği Sınıflar

#### `BaseModel(Base)` — Temel Model
`__abstract__ = True` → Kendisi tablo oluşturmaz, sadece miras verir.

**Ortak Alanlar:**

| Alan | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | UUID | `uuid.uuid4()` | Benzersiz kayıt kimliği, otomatik üretilir |
| `created_at` | DateTime | `datetime.now(UTC)` | Kayıt ilk oluşturulduğunda otomatik set edilir |
| `updated_at` | DateTime | `datetime.now(UTC)` | Her güncelleme'de otomatik değişir (`onupdate`) |
| `is_active` | Boolean | `True` | Kaydı geçici devre dışı bırakmak için (askıya alma) |
| `is_deleted` | Boolean | `False` | Soft delete — kaydı silmeden "silinmiş" işaretler |

**`is_active` vs `is_deleted` farkı:**
- `is_active=False`: Kullanıcı askıya alındı, ders dönem sonu kapatıldı → geri açılabilir
- `is_deleted=True`: Kayıt silindi → çöp kutusundan geri getirilebilir ama listede görünmez

#### `NamedBaseModel(BaseModel)` — İsimli Model
BaseModel'in **tüm alanları + 4 ek alan:**

| Alan | Tip | Açıklama |
|---|---|---|
| `ad` | String(200) | Kaydın tam adı/başlığı (zorunlu) |
| `kisa_ad` | String(50) | Kod adı veya kısaltma (opsiyonel) |
| `aciklama` | Text | Detaylı açıklama (opsiyonel) |
| `etiketler` | JSON | Etiket dizisi, örn: `["python", "web"]` |

### 🧬 Kimler Miras Alıyor?

#### BaseModel'den Türeyen Modeller (14 model):
| Feature | Model | Tablo |
|---|---|---|
| auth | `User` | Kullanıcılar |
| course | `Course` | Dersler |
| course | `CourseEnrollment` | Ders kayıtları (ara tablo) |
| project | `Project` | Projeler |
| project_member | `ProjectMember` | Proje üyeleri (ara tablo) |
| project_category | `ProjectCategory` | Proje kategorileri |
| task | `Task` | Görevler |
| report | `Report` | Haftalık raporlar |
| file | `FileUpload` | Dosya yüklemeleri |
| notification | `Notification` | Bildirimler |
| department | `Department` | Bölümler |
| student_prefix | `StudentYearPrefix` | Öğrenci yıl ön ekleri |
| user_department | `UserDepartment` | Kullanıcı-bölüm ilişkisi (ara tablo) |
| activity_log | `ActivityLog` | Aktivite logları |

#### NamedBaseModel'den Türeyen Modeller:
Şu an **hiçbir model** NamedBaseModel'den türemiyor. Bu sınıf ileride isim/açıklama/etiket gerektiren modeller için hazır bekliyor.

---

## 📄 3. `base_dto.py` — API Şema Base Sınıfları

### Amacı
API'den gelen istek (request) ve giden yanıt (response) verilerinin yapısını tanımlar. Pydantic v2 ile otomatik validasyon sağlar.

### İçerdiği Sınıflar

#### `BaseResponse` — Yanıt Base'i
Her API yanıtında olması gereken ortak alanlar:
```python
class BaseResponse(BaseModel):
    id: UUID                  # Kaydın benzersiz ID'si
    created_at: datetime      # Oluşturulma tarihi
    updated_at: datetime      # Son güncelleme tarihi
    
    model_config = {"from_attributes": True}
    # ↑ Bu ayar SQLAlchemy nesnesini doğrudan Pydantic'e dönüştürmeyi sağlar
    #   Yani: UserResponse.model_validate(db_user) çalışır
```

#### `PaginatedResponse[T]` — Sayfalanmış Yanıt (Generic)
```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]     # Mevcut sayfadaki kayıtlar (herhangi bir tip olabilir)
    total: int         # Toplam kayıt sayısı (tüm sayfalar)
    page: int          # Şu anki sayfa numarası
    size: int          # Sayfa başına kayıt sayısı
    pages: int         # Toplam sayfa sayısı
```

**Generic `T` ne demek?** → `T` yerine herhangi bir tip gelebilir:
- `PaginatedResponse[UserResponse]` → sayfalanmış kullanıcı listesi
- `PaginatedResponse[ProjectResponse]` → sayfalanmış proje listesi
- Aynı yapı, farklı veri tipleriyle kullanılabilir (DRY)

#### `MessageResponse` — Basit Mesaj Yanıtı
```python
class MessageResponse(BaseModel):
    message: str    # Örn: "Kayıt başarıyla silindi"
```
Silme, onaylama gibi işlemlerde kullanılır — veri dönmeye gerek yok, sadece mesaj yeterli.

#### `FilterParams` — Filtreleme/Sayfalama Parametreleri
```python
class FilterParams(BaseModel):
    page: int = 1              # Sayfa numarası (1'den başlar, minimum 1)
    size: int = 20             # Sayfa başına kayıt (min 1, max 100)
    sort_by: str = "created_at"  # Sıralama alanı
    order: str = "desc"        # "asc" veya "desc"
    search: str | None = None  # Arama terimi (opsiyonel)
```
Controller'da `Depends()` ile otomatik query parametresi olarak kullanılır.

### 🧬 Kimler Miras Alıyor?

#### BaseResponse'dan Türeyen DTO'lar (13 response):
| Feature | DTO Sınıfı | Ek Alanlar |
|---|---|---|
| auth | `UserResponse` | email, name, role, department |
| user | `UserListResponse` | email, name, role |
| course | `CourseResponse` | name, code, semester, teacher_id |
| project | `ProjectResponse` | title, description, status, course_id |
| project_member | `ProjectMemberResponse` | user_id, project_id, role |
| project_member | `PendingMemberResponse` | user bilgileri |
| project_category | `CategoryResponse` | name, description, color |
| task | `TaskResponse` | title, status, project_id, ai_suggested |
| report | `ReportResponse` | content, week_number, status, reviewer_note |
| notification | `NotificationResponse` | message, type, is_read |
| department | `DepartmentResponse` | name, code |
| student_prefix | `PrefixResponse` | prefix, year |
| activity_log | `ActivityLogResponse` | action, entity_type, user_id |

---

## 📄 4. `base_repo.py` — Veritabanı CRUD Base Sınıfı

### Amacı
Tüm feature repository'lerinin ortak CRUD (Create, Read, Update, Delete) işlemlerini tanımlar. Bu dosya **en kapsamlı base dosyasıdır** (349 satır).

### `BaseRepository[ModelType]` Sınıfı

```python
class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model    # Hangi tablo ile çalışıyoruz (User, Project vb.)
        self.db = db          # Veritabanı oturumu
```

### Metotlar (Fonksiyonlar) — Detaylı Açıklama

#### Yardımcı Metotlar
| Metot | Ne Yapar |
|---|---|
| `_not_deleted(query)` | Sorguya `is_deleted == False` filtresi ekler. Her READ işleminde çağrılır |
| `_active_filter(query, active_only)` | `active_only=True` ise `is_active == True` filtresi ekler |
| `_is_cascadable(rel)` | Bir ilişkinin cascade için uygun olup olmadığını kontrol eder |

#### CREATE
```python
def create(self, obj_data: dict) -> ModelType:
```
- `obj_data` dictionary'sinden yeni veritabanı kaydı oluşturur
- `self.model(**obj_data)` → model sınıfından nesne yaratır
- `db.add()` → oturuma ekler
- `db.commit()` → veritabanına yazar
- `db.refresh()` → güncel halini (ör. auto-generated id) geri alır

#### READ — Tek Kayıt
```python
def get_by_id(self, id: UUID, active_only=True) -> ModelType | None:
```
- ID ile kayıt arar, silinmişleri otomatik hariç tutar
- `active_only=True` ise pasif kayıtları da hariç tutar
- Bulunamazsa `None` döner

```python
def get_by_id_or_404(self, id: UUID, active_only=True) -> ModelType:
```
- `get_by_id` ile aynı ama bulunamazsa **NotFoundException fırlatır** (HTTP 404)
- Bu sayede controller'da ayrıca null kontrolü yapmaya gerek kalmaz

#### READ — Liste
```python
def get_all(self, skip, limit, sort_by, order, active_only) -> list[ModelType]:
```
- Basit liste çekme: sayfalama + sıralama
- `skip`: Kaç kayıt atlanacak, `limit`: Kaç kayıt getirilecek

```python
def get_many(self, filters, in_filters, like_filters, search, search_fields,
             page, size, sort_by, order, active_only) -> tuple[list, int]:
```
- **En güçlü listeleme metodu**. 4 farklı filtreleme destekler:
  1. `filters`: Kesin eşleşme → `{"status": "APPROVED"}` → `WHERE status = 'APPROVED'`
  2. `in_filters`: IN sorgusu → `{"project_id": [id1, id2]}` → `WHERE project_id IN (...)`
  3. `like_filters`: Benzer arama → `{"department": "Bilgi"}` → `WHERE department ILIKE '%Bilgi%'`
  4. `search` + `search_fields`: Birden fazla alanda arama → OR ile birleştirir
- Toplam sayıyı da döner → `(items, total)` tuple

```python
def count(self, active_only=True) -> int:
```
- Toplam kayıt sayısını döner (silinmişler hariç)

#### UPDATE
```python
def update(self, id: UUID, update_data: dict) -> ModelType:
```
- Kısmi güncelleme (PATCH mantığı)
- Sadece gönderilen alanları günceller, diğerlerine dokunmaz
- `setattr(db_obj, key, value)` ile dinamik güncelleme
- Kayıt bulunamazsa 404 fırlatır

#### DELETE — Soft Delete
```python
def delete(self, id: UUID, cascade=True) -> ModelType:
```
- Kaydı **silmez**, `is_deleted=True` ve `is_active=False` yapar
- `cascade=True` ise **ilişkili child kayıtları da soft siler**

```python
def _soft_cascade(self, parent_obj):
```
- SQLAlchemy `inspect()` ile modelin tüm ilişkilerini bulur
- Her ilişkideki child kayıtları da `is_deleted=True` yapar
- Örnek: Proje silinince → projenin görevleri de soft delete olur

#### DELETE — Hard Delete
```python
def hard_delete(self, id: UUID, cascade=True) -> None:
```
- Kaydı veritabanından **kalıcı olarak siler** (GERİ ALINAMAZ!)
- `cascade=True` ise child kayıtları da kalıcı siler

#### RESTORE
```python
def restore(self, id: UUID) -> ModelType:
```
- Soft delete yapılmış kaydı **geri getirir**
- `is_deleted=False`, `is_active=True` yapar
- Kayıt bulunamazsa veya zaten aktifse 404 fırlatır

### 🧬 Kimler Miras Alıyor?

| Feature | Repository Sınıfı | Model |
|---|---|---|
| auth | `AuthRepo(BaseRepository[User])` | User |
| user | `UserRepo(BaseRepository[User])` | User |
| course | `CourseRepo(BaseRepository[Course])` | Course |
| course | `CourseEnrollmentRepo(BaseRepository[CourseEnrollment])` | CourseEnrollment |
| project | `ProjectRepo(BaseRepository[Project])` | Project |
| project_member | `ProjectMemberRepo(BaseRepository[ProjectMember])` | ProjectMember |
| project_category | `ProjectCategoryRepo(BaseRepository[ProjectCategory])` | ProjectCategory |
| task | `TaskRepo(BaseRepository[Task])` | Task |
| report | `ReportRepo(BaseRepository[Report])` | Report |
| file | `FileRepo(BaseRepository[FileUpload])` | FileUpload |
| notification | `NotificationRepo(BaseRepository[Notification])` | Notification |
| department | `DepartmentRepo(BaseRepository[Department])` | Department |
| student_prefix | `StudentPrefixRepo(BaseRepository[StudentYearPrefix])` | StudentYearPrefix |
| activity_log | `ActivityLogRepo(BaseRepository[ActivityLog])` | ActivityLog |

**Toplam: 14 repository** bu base'den türüyor.

---

## 📄 5. `base_service.py` — İş Mantığı Base Sınıfı

### Amacı
Repository ile Controller arasında köprü kurar. İş kurallarını, validasyonları ve birden fazla repo çağrısını yönetir.

### `BaseService[ModelType, RepoType]` Sınıfı

```python
class BaseService(Generic[ModelType, RepoType]):
    def __init__(self, repo_class: Type[RepoType], db: Session):
        self.db = db
        self.repo: RepoType = repo_class(db)  # Repo'yu otomatik oluşturur
```

**İki generic parametre alır:**
- `ModelType`: Hangi model ile çalışıyor (Project, Task vb.)
- `RepoType`: Hangi repo sınıfını kullanıyor (ProjectRepo, TaskRepo vb.)

### Metotlar

| Metot | Ne Yapar | Çağırdığı Repo Metodu |
|---|---|---|
| `create(data)` | Yeni kayıt oluşturur | `repo.create()` |
| `get(id)` | ID ile kayıt getirir (404 desteği) | `repo.get_by_id_or_404()` |
| `list(filters)` | Sayfalanmış liste döner | `repo.get_all()` + `repo.count()` |
| `update(id, data)` | Kısmi güncelleme (None alanları atlar) | `repo.update()` |
| `delete(id)` | Soft delete | `repo.delete()` |
| `hard_delete(id)` | Kalıcı silme | `repo.hard_delete()` |
| `restore(id)` | Geri getirme | `repo.restore()` |

**`list()` metodu özel**: FilterParams'ı alıp `PaginatedResponse` döner. Sayfa hesaplamasını (`pages = ceil(total / size)`) otomatik yapar.

### 🧬 Kimler Miras Alıyor?

| Feature | Service Sınıfı | Model + Repo |
|---|---|---|
| auth | `AuthService` | ❌ BaseService'den türemez (özel login/register mantığı) |
| user | `UserService(BaseService[User, UserRepo])` | User + UserRepo |
| course | `CourseService(BaseService[Course, CourseRepo])` | Course + CourseRepo |
| project | `ProjectService(BaseService[Project, ProjectRepo])` | Project + ProjectRepo |
| project_member | `ProjectMemberService(BaseService[PM, PMRepo])` | ProjectMember + Repo |
| project_category | `ProjectCategoryService(BaseService[PC, PCRepo])` | ProjectCategory + Repo |
| task | `TaskService(BaseService[Task, TaskRepo])` | Task + TaskRepo |
| report | `ReportService(BaseService[Report, ReportRepo])` | Report + ReportRepo |
| file | `FileService(BaseService[FileUpload, FileRepo])` | FileUpload + FileRepo |
| notification | `NotificationService(BaseService[Notif, NotifRepo])` | Notification + Repo |
| department | `DepartmentService(BaseService[Dept, DeptRepo])` | Department + Repo |
| student_prefix | `StudentPrefixService(BaseService[SP, SPRepo])` | StudentYearPrefix + Repo |
| activity_log | `ActivityLogService(BaseService[AL, ALRepo])` | ActivityLog + Repo |

**Toplam: 12 service** bu base'den türüyor.

---

## 📄 6. `base_manager.py` — Validasyon/Yardımcı İşlemler Base Sınıfı

### Amacı
Service katmanını yardımcı işlemlerden ayırır. İş kuralı validasyonları, durum geçiş kontrolleri ve dış servis çağrıları burada yapılır.

### `BaseManager` Sınıfı

```python
class BaseManager:
    def __init__(self, db: Session = None):
        self.db = db  # Bazı manager'lar DB gerektirmez (ör: AIManager)
```

**En basit base sınıf** — sadece `db` özelliği taşır. Manager'lar kendi özel metotlarını ekler.

### Manager ne zaman kullanılır?
- **Durum geçişi kontrolü**: "Bu proje DRAFT durumunda mı, onaya gönderilebilir mi?"
- **Sahiplik kontrolü**: "Bu görevi sadece projenin sahibi düzenleyebilir mi?"
- **Çakışma kontrolü**: "Bu haftanın raporu zaten var mı?"
- **Dış servis çağrıları**: "AI'dan görev önerisi iste"

### 🧬 Kimler Miras Alıyor?

| Feature | Manager Sınıfı | Sorumluluk |
|---|---|---|
| auth | `AuthManager` | Şifre hashleme, token doğrulama |
| user | `UserManager` | Kullanıcı iş kuralları |
| course | `CourseManager` | Kayıt kontrolü, çakışma |
| project | `ProjectManager` | Durum geçişleri, sahiplik |
| task | `TaskManager` | Görev durum kontrolü |
| report | `ReportManager` | Haftalık rapor çakışma kontrolü |
| ai | `AIManager` | Gemini API çağrıları (DB gerektirmez) |

**Toplam: 7 manager** bu base'den türüyor.

---

## 🔄 Katmanlar Arası Akış

Bir API isteği geldiğinde sırasıyla şu katmanlardan geçer:

```
İstek → Controller → Service → Manager (validasyon) → Repository → Veritabanı
                                                            ↓
Yanıt ← Controller ← Service ← DTO (dönüştürme) ←── Repository ← Veritabanı
```

### Somut Örnek: Proje Oluşturma

```
1. POST /api/v1/projects  → ProjectController alır
2. Controller → ProjectService.create() çağırır
3. Service → ProjectManager ile validasyon yapar (kurs var mı, kullanıcı öğrenci mi)
4. Service → ProjectRepo.create() çağırır         ← BaseRepository.create()
5. Repo → DB'ye kayıt ekler, commit eder
6. Service → ProjectResponse DTO'suna dönüştürür  ← BaseResponse
7. Controller → JSON olarak döner
```

---

## 📊 Miras Haritası (Özet)

```
BaseModel (base_model.py)
├── User                    (auth)
├── Course                  (course)
├── CourseEnrollment        (course)
├── Project                 (project)
├── ProjectMember           (project_member)
├── ProjectCategory         (project_category)
├── Task                    (task)
├── Report                  (report)
├── FileUpload              (file)
├── Notification            (notification)
├── Department              (department)
├── StudentYearPrefix       (student_prefix)
├── UserDepartment          (user_department)
└── ActivityLog             (activity_log)

BaseRepository[Model] (base_repo.py)
├── AuthRepo[User]
├── UserRepo[User]
├── CourseRepo[Course]
├── CourseEnrollmentRepo[CourseEnrollment]
├── ProjectRepo[Project]
├── ProjectMemberRepo[ProjectMember]
├── ProjectCategoryRepo[ProjectCategory]
├── TaskRepo[Task]
├── ReportRepo[Report]
├── FileRepo[FileUpload]
├── NotificationRepo[Notification]
├── DepartmentRepo[Department]
├── StudentPrefixRepo[StudentYearPrefix]
└── ActivityLogRepo[ActivityLog]

BaseService[Model, Repo] (base_service.py)
├── UserService[User, UserRepo]
├── CourseService[Course, CourseRepo]
├── ProjectService[Project, ProjectRepo]
├── ProjectMemberService[ProjectMember, ProjectMemberRepo]
├── ProjectCategoryService[ProjectCategory, ProjectCategoryRepo]
├── TaskService[Task, TaskRepo]
├── ReportService[Report, ReportRepo]
├── FileService[FileUpload, FileRepo]
├── NotificationService[Notification, NotificationRepo]
├── DepartmentService[Department, DepartmentRepo]
├── StudentPrefixService[StudentYearPrefix, StudentPrefixRepo]
└── ActivityLogService[ActivityLog, ActivityLogRepo]

BaseManager (base_manager.py)
├── AuthManager
├── UserManager
├── CourseManager
├── ProjectManager
├── TaskManager
├── ReportManager
└── AIManager

BaseResponse (base_dto.py)
├── UserResponse           (auth)
├── UserListResponse       (user)
├── CourseResponse          (course)
├── ProjectResponse        (project)
├── ProjectMemberResponse  (project_member)
├── PendingMemberResponse  (project_member)
├── CategoryResponse       (project_category)
├── TaskResponse            (task)
├── ReportResponse          (report)
├── NotificationResponse    (notification)
├── DepartmentResponse      (department)
├── PrefixResponse          (student_prefix)
└── ActivityLogResponse     (activity_log)
```
