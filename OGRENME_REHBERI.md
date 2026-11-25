# 📚 UniTrack AI — Öğrenme Rehberi / Çalışma Notu

Bu doküman iki büyük bölümden oluşur:

1. **Backend `base/` yapısı** — her dosya ne işe yarar, içindeki kod ne yapar.
2. **Frontend (web + mobil) ana sayfaları** — her panelden örnek sayfalar ve bu sayfaların backend ile nasıl konuştuğu.

Hedef: kodu satır satır taramadan, mimariyi ve veri akışını kavraman.

---

# BÖLÜM 1 — Backend `base/` Yapısı

## 1.0 Katmanlı Mimari — Büyük Resim

Her feature (auth, project, task...) aynı katman zincirini izler:

```
İstek →  Controller  →  Service  →  Manager  →  Repository  →  Model → DB
         (endpoint)     (akış)      (kural)      (SQL)         (tablo)
                          │            │            │
                          └── DTO (Pydantic şema: request/response) ──┘
```

| Katman | Soru | `base/` karşılığı |
|--------|------|-------------------|
| **Model** | Veri neye benziyor? | `base_model.py` |
| **DTO** | API'ye ne girer/çıkar? | `base_dto.py` |
| **Repository** | DB'den nasıl okurum/yazarım? | `base_repo.py` |
| **Service** | İşi nasıl orkestre ederim? | `base_service.py` |
| **Manager** | Kural geçerli mi, yetki var mı? | `base_manager.py` |

`base/` klasörünün amacı **DRY**: ortak kod tek yerde yazılır, her feature buradan türeyerek tekrar yazmaz.

---

## 1.1 `base_model.py` — Tüm tabloların atası

**Görevi:** Her SQLAlchemy modelinin ortak sütunlarını tek yerde tanımlar. Feature modeli (ör. `User`, `Project`) bu sınıftan türer, kendi özel sütunlarını ekler.

**Kilit kod:**
```python
class BaseModel(Base):
    __abstract__ = True          # Kendi tablosu yok; sadece miras verilir

    id = Column(UUID, primary_key=True, default=uuid.uuid4)   # Her kayıt UUID
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)  # Her UPDATE'te otomatik tazelenir
    is_active  = Column(Boolean, default=True)   # Pasife alma (soft disable)
    is_deleted = Column(Boolean, default=False)  # Soft delete
```

**Anlaması gereken 3 fikir:**
- `__abstract__ = True` → BaseModel'in kendi tablosu **yok**. Sadece `id, created_at, is_deleted...` sütunlarını child'lara miras verir.
- **UUID** primary key → tahmin edilemez, dağıtık sistemlerde çakışmaz.
- **İki silme bayrağı:** `is_active` (öğretmen dersini pasife alır, geri dönülebilir) ve `is_deleted` (soft delete, admin kalıcı silmeden önce). Veri asla aniden kaybolmaz.

---

## 1.2 `base_dto.py` — API şemaları (Pydantic)

**Görevi:** İstek/yanıt gövdelerinin tipini ve doğrulamasını tanımlar. Model = DB tarafı, DTO = API tarafı. İkisi ayrı: DB'de `password_hash` var ama response DTO'sunda yok.

**Kilit sınıflar:**
```python
class BaseResponse(BaseModel):        # Her response'ta ortak
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}   # ORM nesnesinden otomatik dönüşüm

class PaginatedResponse(BaseModel, Generic[T]):   # Sayfalı liste
    items: list[T]; total: int; page: int; size: int; pages: int

class FilterParams(BaseModel):        # Liste endpoint'lerinin query parametreleri
    page: int = 1; size: int = 20
    sort_by: str = "created_at"; order: str = "desc"
    search: str | None = None
```

**Anlaması gereken:**
- `from_attributes=True` → `UserResponse.model_validate(user_orm_object)` çağrısı ORM nesnesini otomatik JSON şemaya çevirir.
- `PaginatedResponse[UserResponse]` gibi **generic** kullanım → tek şema, tüm listeler için (DRY). Frontend her listede `{items, total, page, size, pages}` bekler.
- `FilterParams` → tüm listeleme endpoint'leri aynı sayfalama/sıralama/arama parametrelerini paylaşır.

---

## 1.3 `base_repo.py` — Generic CRUD (en yoğun base)

**Görevi:** Veritabanı erişiminin tamamı. Her feature repo'su (`AuthRepo`, `ProjectRepo`) `BaseRepository[Model]`'den türer ve CRUD'u **bedava** alır.

**Kilit metodlar:**
```python
class BaseRepository(Generic[ModelType]):
    def create(self, obj_data: dict)            # INSERT + commit + refresh
    def get_by_id(self, id, active_only=True)   # is_deleted=False filtresi otomatik
    def get_by_id_or_404(self, id)              # Yoksa NotFoundException
    def get_all(self, skip, limit, sort_by, order)
    def get_many(self, filters, in_filters, like_filters, search, ...)  # → (items, total)
    def update(self, id, update_data: dict)     # Kısmi güncelleme (PATCH)
    def delete(self, id, cascade=True)          # Kalıcı sil + child cascade
    def soft_delete(self, id)                   # is_deleted=True + child cascade
    def restore(self, id)                       # is_deleted=False (admin geri yükleme)
```

**Anlaması gereken 4 fikir:**

1. **Otomatik "silinmiş" filtresi** — `_not_deleted()` her okumaya `is_deleted == False` ekler. Soft-delete edilmiş kayıt sorgularda görünmez.

2. **`get_many` = tek merkezden filtreleme/arama/sayfalama:**
   ```python
   filters     → kesin eşleşme  (status == "APPROVED")
   in_filters  → IN sorgusu     (project_id IN [...])
   like_filters→ ILIKE           (department ILIKE "%Bilgisayar%")
   search      → çok alanda OR   (ad VEYA email içinde ara)
   ```
   Geriye `(items, total)` döner — `total` sayfalama için sayfa sayısını hesaplamada kullanılır.

3. **Cascade silme** — `_cascade_delete` / `_cascade_soft_delete` SQLAlchemy ilişkilerini gezer (`inspect(...).relationships`), sadece **child** yönündeki (`MANYTOONE` olmayan) ve `BaseModel`'den türeyen ilişkileri siler. Yani projeyi silince görevleri/üyeleri de gider, ama tersine (görev → proje) yukarı çıkmaz.

4. **Soft vs Hard** — `soft_delete` sadece bayrak çevirir (geri dönülebilir), `delete` DB'den fiziksel siler. Yetki matrisinde öğretmen=soft, admin=hard.

---

## 1.4 `base_manager.py` — Ortak kural + yetki tabanı ⭐ (yeni yapı)

**Görevi:** Manager katmanının ve **artık BaseService'in de** atası. İş kuralı doğrulaması ve yetki (authorization) kısayollarını barındırır. Tüm yetki mantığını `app/common/authz.py`'a delege eder — yani gerçek kaynak tek: `authz.py`.

> 🔑 **Bu projede alınan mimari karar:** Önceden authz kısayolları hem BaseManager hem BaseService'te ayrı ayrı (ve isimleri tutarsız: `same_id` vs `ids_equal`) tekrar ediyordu. Bir ara `AuthzMixin` denendi ama **kaldırıldı**. Sonuç: **her şey `BaseManager`'dan türüyor** — manager'lar doğrudan, `BaseService` de `BaseManager`'ı miras alıyor. Tek base, sıfır tekrar.

**Kilit kod:**
```python
class BaseManager:
    def __init__(self, db: Optional[Session] = None):
        self.db = db                          # DB'siz manager da olabilir (AIManager)

    @staticmethod
    def ids_equal(a, b) -> bool:              # UUID/str eşitlik (tip farkını yok sayar)
        return authz.ids_equal(a, b)

    @staticmethod
    def is_owner(entity, owner_field, user):  # entity.<field> == user.id ?
        return authz.is_owner(entity, owner_field, user)

    def require_admin(self, user, *, message=...):           # ADMIN değilse 403
        authz.require_admin(user, message=message)

    def require_owner_or_admin(self, entity, owner_field, user, *, allow_admin=True, entity_name="kayıt"):
        authz.require_owner_or_admin(...)     # Sahip değil + admin değilse 403

    def require_course_owner_if_teacher(self, course, user, *, message=...):
        authz.require_course_owner_if_teacher(...)  # Öğretmen sadece kendi dersine
```

**Feature manager'da kullanımı (ör. ProjectManager):**
```python
class ProjectManager(BaseManager):
    def validate_project_owner(self, project, user):
        self.require_owner_or_admin(project, "created_by", user, entity_name="proje")
```

**Anlaması gereken:**
- Manager = **karar verir, akış yönetmez**. "Bu durum geçişi geçerli mi?", "Bu kullanıcı sahibi mi?" Service'i kalabalıktan kurtarır.
- Yetki mantığı tek kaynakta (`authz.py`); BaseManager sadece `self.*` kısayolu sunar.
- `db` opsiyonel → AI gibi DB gerektirmeyen manager `super().__init__()` ile türeyebilir.

---

## 1.5 `base_service.py` — Generic orkestrasyon

**Görevi:** Controller ile repository arasında iş akışını yürütür. `BaseManager`'dan türediği için yetki kısayolları hazır gelir; ayrıca generic CRUD + sayfalama sunar.

**Kilit kod:**
```python
class BaseService(BaseManager, Generic[ModelType, RepoType]):   # ⭐ BaseManager'dan türüyor
    def __init__(self, repo_class, db):
        super().__init__(db)                   # BaseManager.__init__ → self.db
        self.repo = repo_class(db)

    def create(self, data): return self.repo.create(data)
    def get(self, id):      return self.repo.get_by_id_or_404(id)

    @staticmethod
    def paginate(items, total, page, size) -> PaginatedResponse:
        return PaginatedResponse(items=items, total=total, page=page, size=size,
                                 pages=math.ceil(total / size) if size > 0 else 0)

    def list(self, filters: FilterParams):     # Sayfalı + sıralı + filtreli liste
        skip = (filters.page - 1) * filters.size
        items = self.repo.get_all(skip=skip, limit=filters.size,
                                  sort_by=filters.sort_by, order=filters.order)
        total = self.repo.count()
        return self.paginate(items, total, filters.page, filters.size)

    def update(self, id, data):                # None alanları atla (kısmi PATCH)
        update_data = {k: v for k, v in data.items() if v is not None}
        return self.repo.update(id, update_data)
```

**Anlaması gereken:**
- `paginate` → tüm servisler liste dönerken aynı `PaginatedResponse`'u üretir (DRY tek kaynak). Frontend bu yüzden her listede `data.items`, `data.total`, `data.pages` bulur.
- `update` → `None` olan alanlar güncellenmez → kısmi PATCH semantiği.
- Feature service'i ihtiyaç oldukça override eder; basit CRUD'da base yeter.

---

## 1.6 Yardımcı `common/` dosyaları (base'i tamamlayan)

| Dosya | İçerik |
|-------|--------|
| `authz.py` | **Yetki tek-kaynağı.** `ids_equal`, `is_admin`, `is_owner`, `require_admin`, `require_owner_or_admin`, `require_course_owner_if_teacher`. Saf fonksiyonlar, DB yok. |
| `validators.py` | `validate_school_email`, `determine_role_from_email`, `validate_youtube_url`, `validate_password_strength`, `parse_student_number`. |
| `exceptions.py` | `AppException` + alt sınıflar: `NotFound(404)`, `BadRequest(400)`, `Unauthorized(401)`, `Forbidden(403)`, `Conflict(409)`. Her biri bir HTTP koduna bağlı. |
| `exception_handlers.py` | FastAPI global handler — bu exception'ları yakalar, JSON `{detail, status_code}` döner. Frontend `error.response.data.detail` ile okur. |

**Bağlantı:** Service/manager bir kural ihlali görünce `raise ForbiddenException("...")` der → global handler 403 + JSON'a çevirir → axios interceptor / sayfa `detail`'i kullanıcıya gösterir. Tek satırlık `raise`, uçtan uca hata akışını tetikler.

---

# BÖLÜM 2 — Frontend (Web + Mobil)

## 2.0 İki İstemci, Tek Backend

```
┌──────────────┐         ┌──────────────┐
│  WEB         │         │  MOBİL       │
│  Next.js     │         │  Expo / RN   │
│  frontend/   │         │  mobile/     │
└──────┬───────┘         └──────┬───────┘
       │  apiClient (axios)     │  apiClient (axios)
       └──────────┬─────────────┘
                  ▼
        FastAPI  /api/v1/...   (localhost:19000 → container 8000)
```

İkisi de aynı REST API'ye konuşur. Fark sadece **token saklama** ve **UI**:
- Web → token `Cookies` içinde.
- Mobil → token `expo-secure-store` (şifreli) içinde.

---

## 2.1 `apiClient` — Tüm backend trafiğinin tek kapısı (DRY)

**Web** (`frontend/src/lib/apiClient.ts`):
```ts
const apiClient = axios.create({ baseURL: NEXT_PUBLIC_API_URL || "http://localhost:19000" });

// İSTEK öncesi: cookie'deki JWT'yi header'a ekle
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// YANIT sonrası: 401 → token sil, /login'e at
apiClient.interceptors.response.use(r => r, (error) => {
  if (error.response?.status === 401) { Cookies.remove("access_token"); window.location.href = "/login"; }
  return Promise.reject(error);
});
```

**Mobil** (`mobile/src/lib/apiClient.ts`) aynı fikir + **otomatik token yenileme:**
```ts
// 401 gelince: refresh_token ile /auth/refresh çağır, yeni access_token al, isteği TEKRARLA
// isRefreshing kilidi → aynı anda çok refresh isteği gitmesini engeller (kuyruk)
const { data } = await axios.post(`${baseUrl}/api/v1/auth/refresh`, { refresh_token });
await SecureStore.setItemAsync("access_token", data.access_token);
originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
return apiClient(originalRequest);   // başarısız isteği yeniden dene
```

**Anlaması gereken:**
- Her sayfa `import apiClient` eder; base URL ve token ekleme **hiçbir yerde tekrar yazılmaz** (DRY).
- **Interceptor** = istek/yanıtın ortasına giren ara katman. JWT eklemeyi ve 401 yönetimini merkezîleştirir.
- Mobilde refresh akışı backend'in token rotation'ı ile eşleşir: eski refresh tek kullanımlık (`refresh()` service'i jti'yi revoke eder) → mobil yeni çifti saklar.

---

## 2.2 `AuthContext` — Oturum durumunu uygulamaya yayar

**Web** (`frontend/src/context/AuthContext.tsx`):
```ts
const fetchUser = async () => {
  const token = Cookies.get("access_token");
  if (!token) return setUser(null);
  const { data } = await apiClient.get("/api/v1/auth/me");   // token geçerli mi + profil
  setUser(data);
};

const login = async (credentials) => {
  const { data } = await apiClient.post("/api/v1/auth/login", credentials);
  Cookies.set("access_token", data.access_token);
  Cookies.set("refresh_token", data.refresh_token);
  await fetchUser();                                          // login sonrası profili çek
};
```

**Anlaması gereken:**
- Uygulama açılınca `GET /api/v1/auth/me` ile mevcut token doğrulanır → `user` state'i dolar.
- Tüm sayfalar `user.role` üzerinden **rol bazlı** UI gösterir (STUDENT / TEACHER / ADMIN).
- Bu `me` endpoint'i backend'de `auth_controller → get_current_user dependency → JWT decode → DB'den user` zincirini çalıştırır.

---

## 2.3 ÖĞRENCİ PANELİ — 2 Sayfa

### 📄 Öğrenci Sayfa 1: Yeni Proje Oluştur (web)
`frontend/src/app/dashboard/projects/new/page.tsx`

**Ne yapar:** Öğrenci başlık/açıklama/ders seçer, projeyi **taslak** kaydeder veya direkt **onaya gönderir**.

**Backend etkileşimi:**
```ts
// 1) Sayfa açılınca dersleri çek (dropdown doldur)
apiClient.get("/api/v1/courses").then(({ data }) => setCourses(data.items ?? []));

// 2) Ders seçilince o dersin proje tipini öğren (bireysel/ekip/her ikisi)
const { data } = await apiClient.get(`/api/v1/courses/${courseId}`);

// 3) Projeyi oluştur
const { data } = await apiClient.post("/api/v1/projects", {
  title, description, course_id, project_type, github_url
});

// 4) "Onaya Gönder" seçildiyse ikinci çağrı
await apiClient.post(`/api/v1/projects/${data.id}/submit`);
```

**Uçtan uca akış (POST /projects):**
```
Form submit
 → apiClient.post (interceptor JWT ekler)
 → FastAPI POST /api/v1/projects
 → project_controller (DTO doğrular: title≥3, desc≥10)
 → ProjectService.create
 → ProjectManager (kurallar: ders var mı, üye limiti...)
 → ProjectRepo.create  → INSERT → DB
 → ProjectResponse JSON → sayfa data.id alır → başarı ekranı
```
Hata olursa (ör. 400) → `getErrorMessage(err)` ile `detail` ekranda kırmızı kutuda gösterilir.

---

### 📄 Öğrenci Sayfa 2: Haftalık Rapor Oluştur (web)
`frontend/src/app/dashboard/reports/new/page.tsx`

**Ne yapar:** Öğrenci proje seçer, haftalık içerik + opsiyonel YouTube linki + dosya yükler. Hafta/yıl backend'de **otomatik** belirlenir.

**Backend etkileşimi — iki aşamalı (önce rapor, sonra dosya):**
```ts
// 1) Raporu oluştur (JSON)
const { data } = await apiClient.post("/api/v1/reports", {
  project_id, content, youtube_url
});

// 2) Dosya seçildiyse multipart olarak ekle
const formData = new FormData();
formData.append("file", selectedFile);
await apiClient.post(`/api/v1/reports/${data.id}/files`, formData, {
  headers: { "Content-Type": "multipart/form-data" }
});
```

**Anlaması gereken:**
- **409 Conflict** özel olarak yakalanır: aynı hafta+proje için ikinci rapor → backend `ConflictException` fırlatır (`ReportManager.validate_weekly_uniqueness`), sayfa "bu hafta zaten rapor var" der.
- Dosya ayrı endpoint'e **multipart** gider (JSON değil). Backend `FileService` MinIO'ya yükler.
- Hafta numarası frontend'den gelmez → `ReportManager.get_current_week_and_year()` ISO haftasını üretir. Tek doğruluk kaynağı backend.

---

## 2.4 ÖĞRETMEN PANELİ — 2 Sayfa

### 📄 Öğretmen Sayfa 1: Proje Onay/Red (mobil)
`mobile/src/screens/projects/ProjectListScreen.tsx`

**Ne yapar:** Öğretmen/admin için projeler **derse göre gruplu tablo** halinde listelenir; `pending` projelerde Onayla/Reddet butonları çıkar. (Öğrenci ise kart görünümü görür — aynı ekran, role göre dallanır.)

**Backend etkileşimi:**
```ts
// Liste (öğretmen kendi derslerinin projelerini görür — yetki backend'de süzülür)
const { data } = await apiClient.get("/api/v1/projects", { params: { size: "100", search, status } });

// Onayla
await apiClient.post(`/api/v1/projects/${projectId}/approve`);

// Reddet (onay dialogu sonrası)
await apiClient.post(`/api/v1/projects/${projectId}/reject`);
```

**Uçtan uca akış (approve):**
```
Onayla butonu
 → POST /api/v1/projects/{id}/approve  (JWT header'da)
 → project_controller
 → ProjectService.approve
 → ProjectManager.validate_status_transition(PENDING → APPROVED)   ← durum makinesi
 → require_owner_or_admin / öğretmen ders sahipliği kontrolü
 → ProjectRepo.update(status=APPROVED) → DB
 → fetchProjects() ile liste tazelenir
```

**Anlaması gereken:**
- **Yetki frontend'de DEĞİL backend'de** zorlanır. UI butonu gizlese bile, asıl koruma `ProjectManager` + `authz`'da. Öğrenci approve endpoint'ini çağırsa `ForbiddenException` (403) yer.
- **Durum geçişi** rastgele değil: `VALID_TRANSITIONS` haritası sadece `PENDING → APPROVED/REJECTED` gibi geçişlere izin verir. Geçersizse `BadRequestException`.
- `safeErrorMsg` → backend `detail`'i (string veya validation listesi) güvenli okur, `Alert` ile gösterir.

---

### 📄 Öğretmen Sayfa 2: "Öğrencilerim" Görünümü (web)
`frontend/src/app/dashboard/users/page.tsx` (öğretmen modu, `?onlyMine=true`)

**Ne yapar:** Aynı kullanıcılar sayfası rol'e göre davranır. Öğretmen geldiğinde `my-students` endpoint'ine geçer — sadece **kendi bölümüne atanmış öğrenciler** listelenir, salt-görüntüleme.

**Backend etkileşimi:**
```ts
const useMyStudents = isTeacher && onlyMineParam;
const endpoint = useMyStudents
  ? `/api/v1/users/my-students?${params}`   // öğretmen: kısıtlı küme
  : `/api/v1/users?${params}`;              // admin: tüm kullanıcılar
const { data } = await apiClient.get(endpoint);
setUsers(data.items); setTotal(data.total); setTotalPages(data.pages);
```

**Anlaması gereken:**
- Tek sayfa, **iki endpoint** → admin ve öğretmen aynı UI'ı paylaşır ama backend farklı veri kümesi döner (yetki sınırı). DRY + güvenlik birlikte.
- `params` → `page, size, sort_by, order, search, department_id...` → backend'de `FilterParams` + `repo.get_many` filtrelerine birebir karşılık gelir.
- Yanıt `{items, total, pages}` → `base_dto.PaginatedResponse` şeması. Frontend `DataTable` bunu doğrudan tüketir.

---

## 2.5 ADMİN PANELİ — 2 Sayfa

### 📄 Admin Sayfa 1: Kullanıcı Yönetimi (web)
`frontend/src/app/dashboard/users/page.tsx` (admin modu)

**Ne yapar:** Admin tüm kullanıcıları listeler, filtreler (rol, bölüm, sınıf, durum, arama), detay modalında düzenler, pasife alır/aktive eder, kalıcı siler, yeni kullanıcı ekler.

**Backend etkileşimi (CRUD'un tamamı):**
```ts
apiClient.get(`/api/v1/users?${params}`)                     // Listele + filtrele + sayfala
apiClient.patch(`/api/v1/users/${id}`, { email, role, ... }) // Güncelle (kısmi)
apiClient.patch(`/api/v1/users/${id}/student-info`, {...})   // Öğrenci no/sınıf
apiClient.post(`/api/v1/users/${id}/deactivate`)             // Pasife al (soft)
apiClient.post(`/api/v1/users/${id}/restore`)                // Geri aktive et
apiClient.delete(`/api/v1/users/${id}`)                      // Kalıcı sil (hard)
```

**Anlaması gereken:**
- **Filtre state → query string → backend:** `search, is_active, department_id, grade_label, student_no` parametreleri `URLSearchParams` ile kurulup endpoint'e eklenir; backend `UserRepo.get_many` ile süzer. Frontend filtre mantığı yok — sadece parametre yollar.
- **Soft vs Hard:** `deactivate` = `is_active=False` (geri dönülür), `delete` = DB'den kalıcı (`base_repo.delete` + cascade). UI dialog metni bu farkı kullanıcıya açıkça söyler.
- **Optimistik değil, tazeleyici akış:** her mutasyondan sonra `fetchUsers()` → listeyi backend'den yeniden çeker (tek doğruluk kaynağı = DB).
- Hata: `err.response.data.detail` → `toast.error(...)`. Ör. "son admin'in rolü değiştirilemez" mesajı `UserManager.validate_role_change`'den gelir.

---

### 📄 Admin Sayfa 2: Kalıcı Silme + Yeni Kullanıcı (web)
Aynı sayfadaki **admin-only aksiyonlar** (`AdminCreateUserModal`, ConfirmDialog).

**Ne yapar:** Sadece admin'e görünen "Yeni Kullanıcı Ekle" ve "Kalıcı Sil" işlemleri.

**Backend etkileşimi:**
```ts
// Yeni kullanıcı (modal) — admin manuel rol atayabilir (öğretmen/admin)
apiClient.post("/api/v1/auth/register" veya admin create endpoint, { email, role, ... });

// Kalıcı silme — onay dialogu sonrası
await apiClient.delete(`/api/v1/users/${deleteTarget.id}`);
```

**Anlaması gereken:**
- UI'da `{isAdmin && <button>...}` ile butonlar gizlenir **ama** asıl yetki backend `require_admin`'de. Frontend gizleme = UX, backend kontrol = güvenlik. İkisi ayrı katman.
- **Geri alınamaz işlemler** her zaman `ConfirmDialog` arkasında (`isDestructive` kırmızı). Mobilde karşılığı `Alert.alert(..., style:'destructive')`.
- Rol atama kuralı backend'de: `@ogr.` mail → STUDENT zorunlu; öğretmen/admin manuel. Frontend sadece formu gönderir, kuralı `AuthManager.validate_register_data` uygular.

---

## 2.7 Mobil — Ek Örnekler

Önceki bölümde mobil tarafından sadece `ProjectListScreen` (öğretmen, onay/red) gösterilmişti. Aşağıda iki mobil ekran daha — biri öğrenci (multipart dosya yükleme), biri öğretmen (rol bazlı liste). Web tarafındaki muadilleriyle karşılaştırıldığında React Native özel kısımları (DocumentPicker, `Alert`, `RefreshControl`, NativeWind) farkı görmek için iyi örnek.

---

### 2.7.1 Mobil — Öğrenci — Haftalık Rapor Oluştur

**Dosya:** [mobile/src/screens/reports/ReportCreateScreen.tsx](mobile/src/screens/reports/ReportCreateScreen.tsx)

**Ne yapar:** Öğrenci aktif projelerinden birini seçer → ders zorunluluklarını (YouTube / dosya) görür → rapor metni + opsiyonel video linki + opsiyonel dosya gönderir. Backend hafta numarasını **kendisi** hesaplar, frontend sadece `project_id` ve `content` yollar.

**Anahtar kod — 3 endpoint birden:**

```tsx
// 1. AÇILIŞTA: öğrencinin projelerini çek (dropdown doldur)
useEffect(() => {
  const fetchProjects = async () => {
    try {
      const { data } = await apiClient.get('/api/v1/projects');
      setProjects(data.items ?? []);
    } catch { /* sessizce devam */ }
  };
  fetchProjects();
}, []);

// 2. PROJE SEÇİLDİĞİNDE: ders gereksinimlerini çek (uyarı paneli için)
const fetchCourseRequirements = async (project: Project) => {
  setCourseRequirements(null);
  if (!project.course_id) return;
  try {
    const { data } = await apiClient.get<Course>(`/api/v1/courses/${project.course_id}`);
    if (data.require_youtube || data.require_file) {
      setCourseRequirements({
        require_youtube: data.require_youtube,
        require_file: data.require_file,
      });
    }
  } catch { /* sessizce devam */ }
};

// 3. GÖNDERİMDE: önce rapor oluştur, sonra dosya yükle (iki ayrı çağrı)
const handleCreate = async () => {
  if (!selectedProjectId) return Alert.alert('Hata', 'Lütfen bir proje seçin.');
  if (!content.trim() || content.trim().length < 20) {
    return Alert.alert('Hata', 'Rapor içeriği en az 20 karakter olmalı.');
  }
  try {
    setIsLoading(true);
    const { data } = await apiClient.post('/api/v1/reports', {
      project_id: selectedProjectId,
      content: content.trim(),
      ...(youtubeUrl.trim() ? { youtube_url: youtubeUrl.trim() } : {}),
    });

    if (selectedFile && data?.id) {
      await uploadFile(data.id);   // <-- ayrı endpoint, ayrı çağrı
    }

    Alert.alert('Başarılı', 'Haftalık rapor TASLAK olarak oluşturuldu!', [
      { text: 'Tamam', onPress: () => navigation.goBack() },
    ]);
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 409) {
      Alert.alert('Uyarı', 'Bu proje için bu hafta zaten bir rapor oluşturdunuz.');
    } else {
      Alert.alert('Hata', safeErrorMsg(error, 'Rapor oluşturulamadı.'));
    }
  } finally {
    setIsLoading(false);
  }
};
```

**Multipart dosya yükleme (React Native özel formu):**

```tsx
const handlePickFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (!result.canceled && result.assets?.length > 0) {
    setSelectedFile(result.assets[0]);
  }
};

const uploadFile = async (reportId: string) => {
  if (!selectedFile) return;
  const formData = new FormData();
  formData.append('file', {
    uri: selectedFile.uri,                         // <-- file:// path
    name: selectedFile.name,
    type: selectedFile.mimeType || 'application/octet-stream',
  } as any);                                       // RN tipleri Blob beklemiyor → as any

  try {
    await apiClient.post(`/api/v1/reports/${reportId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } catch {
    Alert.alert('Uyarı', 'Rapor oluşturuldu fakat dosya yüklenemedi. Daha sonra eklenebilir.');
  }
};
```

**Backend uçtan uca akış — `POST /reports`:**

```
ReportCreateScreen.handleCreate
  ↓ apiClient.post  (Authorization: Bearer <jwt>)
report_controller.create  (yetki: STUDENT)
  ↓
report_service.create_report
  ↓
report_manager.compute_week_and_year(today)        # hafta/yıl backend hesaplar
report_manager.assert_no_duplicate(project_id,     # aynı hafta varsa → 409
                                    week, year)
report_manager.validate_membership(user, project)  # öğrenci projenin üyesi mi?
  ↓
report_repo.create(...)
db.commit()
  ↓ ReportResponse{id, week_number, year, status:"DRAFT", ...}
frontend: data.id alır → ayrı çağrı uploadFile(data.id)
```

**Anlaması gereken (mobil ile web farkı):**

| Konu | Web | Mobil |
|------|-----|-------|
| Dosya seçme | `<input type="file">` + `FormData.append("file", File)` | `DocumentPicker` + `FormData.append("file", {uri,name,type})` |
| Hata göster | Kırmızı div + `setError(msg)` | `Alert.alert("Hata", msg)` |
| Loading | `disabled={isLoading}` | `<Button isLoading={isLoading}>` |
| Navigation | `router.push("/dashboard/reports")` | `navigation.goBack()` |
| 409 mantığı | **AYNI** | **AYNI** — backend tek kuralı belirler |

**Önemli:**
- **Hafta numarasını frontend HESAPLAMAZ.** `report_manager.compute_week_and_year` tek kaynak. Mobil/web aynı endpoint'i çağırır, aynı sonucu alır.
- **İki adım vermek zorunda kalan tek akış:** rapor oluştur (JSON) → dosya yükle (multipart). Tek endpoint'te birleşse multipart parser her isteği yavaşlatırdı. Backend'i hafif tutmak için ayrılmış.
- **409 status** = backend `ConflictException` (manager fırlatır) → axios `error.response.status` ile yakalanır. Bu kontrat backend → frontend açık sözleşme.

---

### 2.7.2 Mobil — Öğretmen — Ders Listesi (Rol Bazlı)

**Dosya:** [mobile/src/screens/courses/CourseListScreen.tsx](mobile/src/screens/courses/CourseListScreen.tsx)

**Ne yapar:** Tek ekran, üç rol için **farklı başlık + farklı yetki** gösterir. Backend zaten role göre filtrelenmiş liste döner (öğretmen sadece kendi derslerini görür), frontend sadece UI'ı role'a göre çevirir.

**Anahtar kod — tek fetch, rol bazlı render:**

```tsx
export const CourseListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Veri çekme — useCallback ile referans stabil tut (RefreshControl için)
  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Course>>('/api/v1/courses');
      setCourses(data.items);                          // <-- {items,total,page,size,pages}
    } catch (error: any) {
      const msg = error.response?.data?.detail;
      Alert.alert('Hata', typeof msg === 'string' ? msg : 'Dersler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // ROL BAZLI YETKİ — sadece UI kontrolü; gerçek koruma backend'de
  const isEditable     = role === 'TEACHER' || role === 'ADMIN';
  const canCreateCourse = role === 'ADMIN';

  // ROL BAZLI BAŞLIK
  const getTitle = () => {
    if (role === 'ADMIN')   return 'Tüm Dersler';
    if (role === 'TEACHER') return 'Verdiğim Dersler';
    return 'Ders Kataloğu';
  };
  // ...
};
```

**Pull-to-refresh (mobil özel):**

```tsx
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); fetchCourses(); }}
      tintColor="#818cf8"
    />
  }
>
  {/* Liste */}
</ScrollView>
```

**Rol bazlı koşullu render:**

```tsx
{canCreateCourse && (
  <TouchableOpacity onPress={() => navigation.navigate('CourseCreate')}>
    <Plus size={20} color="#ffffff" />
  </TouchableOpacity>
)}

{/* Öğretmen kendi dersi olduğu için kendi adını görmez */}
{role !== 'TEACHER' && course.teacher_name && (
  <Text>{course.teacher_name}</Text>
)}

{/* Sadece düzenleyebilenler tıklayınca CourseEdit'e gider */}
<TouchableOpacity
  activeOpacity={isEditable ? 0.7 : 1}
  onPress={() => {
    if (isEditable) navigation.navigate('CourseEdit', { courseId: course.id });
  }}
>
```

**Backend uçtan uca akış — `GET /courses`:**

```
CourseListScreen.fetchCourses
  ↓ apiClient.get  (Authorization: Bearer <jwt>)
course_controller.list (dependency: get_current_user)
  ↓
course_service.list
  ↓
  if user.role == "STUDENT": filter = {is_active: True}              # hepsi
  if user.role == "TEACHER": filter = {teacher_id: user.id, is_active: True}  # sadece kendi
  if user.role == "ADMIN":   filter = {}                              # her şey
  ↓
course_repo.get_many(filter, pagination)
  ↓ {items, total, page, size, pages}
frontend: data.items → setCourses → liste render
```

**Anlaması gereken:**

- **Backend role'a göre farklı veri döner — frontend FİLTRELEMEZ.** Öğretmen "kendi dersleri" görür çünkü backend zaten `teacher_id=user.id` filtresi koyar. Frontend `courses.filter(c => c.teacher_id === user.id)` yapmaz — bu hem güvensiz (tüm veri kullanıcıya gider) hem gereksiz.
- **`PaginatedResponse<Course>` web ile birebir aynı.** Backend tek kontrat, iki platform aynı tipi kullanır (`mobile/src/types/course.ts` ve `frontend/src/types/course.ts` — şekiller eşleşir).
- **UI gizleme ≠ güvenlik.** `canCreateCourse` butonu gizler ama öğrenci doğrudan `POST /courses` çağırsa backend `require_admin` 403 atar. Gerçek koruma orada.
- **`useCallback` neden gerekli?** `RefreshControl` `onRefresh` referans değişimine duyarlı; `useCallback` olmadan her render'da yeni fonksiyon → gereksiz re-render.
- **NativeWind = Tailwind RN'de.** `className="bg-slate-950 p-4"` web ile aynı syntax; arkada `StyleSheet` oluşturur.

**Web–Mobil sözleşme:**

| Katman | Web | Mobil |
|--------|-----|-------|
| Endpoint | `GET /api/v1/courses` | **AYNI** |
| Yanıt şekli | `PaginatedResponse<Course>` | **AYNI** |
| Yetki filtreleme | Backend | **AYNI yerde** |
| Token taşıma | Cookie | SecureStore |
| Liste UI | `<DataTable>` | `<ScrollView>` + `<Card>` |
| Yenileme | F5 / re-mount | Pull-to-refresh |
| Sil/oluştur butonu gizleme | `{isAdmin && ...}` | `{canCreateCourse && ...}` |

İki platform aynı backend kontratını paylaşır; sadece sunum + token saklama farklı.

---

## 2.8 Özet — Frontend ↔ Backend Etkileşim Deseni

Her sayfa aynı 5 adımı izler:

```
1. apiClient ile istek at            (baseURL + JWT interceptor otomatik)
2. Backend katmanları çalışır        (controller → service → manager → repo → DB)
3. Yetki/kural backend'de zorlanır   (authz + manager; UI'daki gizleme sadece kozmetik)
4. Yanıt standart şema              (tekil: BaseResponse / liste: PaginatedResponse)
5. Hata standart                    ({detail, status_code} → toast/Alert/kırmızı kutu)
```

**Altın kurallar (sınavda/projede hatırla):**
- **Tek doğruluk kaynağı = backend.** Hafta numarası, yetki, durum geçişi, rol — hepsi backend'de. Frontend yollar, gösterir; karar vermez.
- **DRY her iki tarafta:** backend `base/`, frontend `apiClient` + `PaginatedResponse` deseni.
- **Liste sözleşmesi:** backend `{items, total, page, size, pages}` döner; web `DataTable`, mobil grup/kart bunu bekler.
- **Güvenlik iki katmanlı:** UI gizleme (UX) + backend `require_admin/owner` (gerçek koruma).

---

## Hızlı Endpoint → Sayfa Haritası

| Panel | Sayfa | Ana endpoint(ler) |
|-------|-------|--------------------|
| Öğrenci | Proje oluştur | `POST /projects`, `POST /projects/{id}/submit` |
| Öğrenci | Rapor oluştur | `POST /reports`, `POST /reports/{id}/files` |
| Öğretmen | Proje onay/red | `GET /projects`, `POST /projects/{id}/approve\|reject` |
| Öğretmen | Öğrencilerim | `GET /users/my-students` |
| Admin | Kullanıcı yönetimi | `GET\|PATCH\|DELETE /users/{id}`, `/deactivate`, `/restore` |
| Admin | Yeni kullanıcı / kalıcı sil | `POST /auth/register`, `DELETE /users/{id}` |
| Öğrenci (mobil) | Rapor oluştur + dosya | `GET /projects`, `GET /courses/{id}`, `POST /reports`, `POST /reports/{id}/files` |
| Öğretmen (mobil) | Ders listesi (rol bazlı) | `GET /courses` (backend role'a göre filtreler) |
