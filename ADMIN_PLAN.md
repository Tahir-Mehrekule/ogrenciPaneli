# 🛠️ ADMIN PLAN — Manuel Test Sonrası Hata Düzeltmeleri ve İyileştirmeler

> Tarih: 2026-05-17 (devam)
> Onay sonrası ayrı bir dosya `ADMIN_PLAN.md` (proje kökünde) olarak da kaydedilecek.

## 📌 Bağlam

5 paket tamamlandıktan sonra admin paneli manuel test edildi. Aşağıdaki 7 sorun/yeni gereksinim bulundu — hepsi birbirine bağlı küçük admin akışı düzeltmeleri:

1. **(BUG)** Admin "Yeni Ders" formunda bölüm dropdown'u boş — frontend `/api/v1/departments` çağırıyor, backend sadece `/api/v1/admin/departments` (admin-prefix) sunuyor; `.catch(()=>{})` ile hata yutuluyor.
2. **(UX)** Admin ve öğretmen "Tüm Projeler"de **DRAFT** projeleri görüyor — sadece öğrenci kendi taslağını görmeli.
3. **(BUG)** "Tüm Raporlar" sayfasında filtre dropdown'undan **"Taslak"** seçince React runtime error: `Objects are not valid as a React child (found: object with keys {type,loc,msg,input,ctx})`. Sebep: frontend "DRAFT" (uppercase) gönderiyor, backend `ReportStatus` enum'u `"draft"` (lowercase) bekliyor → Pydantic 422 detail array → `setError(detail)` array'i render'a verince çöküyor.
4. **(UX)** Admin'de "Öğrenciler" ve "Tüm Kullanıcılar" iki ayrı sayfa — duplikasyon. Tek sayfa olmalı (role tabı zaten `/dashboard/users`'da var).
5. **(YENİ)** Admin manuel **öğretmen + öğrenci ekleme** akışı yok. Mevcut yalnız `register` self-signup. Admin formda tüm bilgileri (rol, email, **geçici şifre**, ad/soyad, bölüm, öğrenci ise no + sınıf + ders) girip eklesin.
6. **(YENİ)** Admin ders oluştururken **teacher_id atayabilsin**. Şu an `course_service.create_course` `teacher_id = current_user.id` yapıyor → admin oluşturduğu derse otomatik kendisi öğretmen olarak atanıyor.
7. **(POLITIKA)** Öğretmenin ders oluşturma yetkisi **kaldırılacak** — sadece admin oluşturur. Öğretmen yalnız atandığı derse erişir (zaten `course_service.list_courses` TEACHER için `teacher_id` filtresi uygular).

## ✅ Onaylanmış Kararlar (Bu konuşmadan)

| # | Karar | Etki |
|---|-------|------|
| A | **Şifre:** Admin formda "Geçici şifre" alanı girer | Email/SMTP gerekmez, en hızlı yol |
| B | **Students sayfası tamamen silinir** | Hem admin hem teacher için `/dashboard/users` (role filtreli) yeterli |
| C | **Departments listesi auth-required (tüm roller okur)** | `/api/v1/departments` GET — login olan herkes; register sayfası kendi public endpoint'iyle çalışır (mevcut) |

---

## 📦 İş Paketleri

### Paket A — Backend Düzeltmeleri (~2 saat)

**A1. Public department list endpoint**
- Yeni router: `/api/v1/departments` (GET, list) — `get_current_user` ile auth-required, tüm roller okur.
- Mevcut `/api/v1/admin/departments` CRUD ADMIN-only kalır (POST/PATCH/DELETE).
- Dosyalar:
  - `backend/app/features/department/department_controller.py` (yeni endpoint veya yeni router)
  - `backend/app/main.py` (yeni router include)

**A2. Backend'de DRAFT default exclude (rol bazlı)**
- `backend/app/features/project/project_service.py:list_projects` — `current_user.role in [TEACHER, ADMIN]` ise `exclude_status=DRAFT` default (frontend bypass edilirse bile korunur).
- `backend/app/features/report/report_service.py:list_reports` — aynı default. STUDENT kendi DRAFT'ını görür.

**A3. Admin user create endpoint**
- DTO: `AdminCreateUserRequest` (`backend/app/features/user/user_dto.py`)
  - `email: EmailStr`, `password: str (min 8)`, `first_name`, `last_name`
  - `role: UserRole` (sadece STUDENT veya TEACHER kabul; admin yaratmak için ayrı flow)
  - `department_ids: list[UUID]` (TEACHER için ≥1 zorunlu; STUDENT için ≥1)
  - `student_no: Optional[str]` (STUDENT'sa zorunlu, regex 9 hane)
  - `class_section_id: Optional[UUID]`, `grade_label: Optional[str]` (STUDENT)
  - `course_ids: list[UUID]` opsiyonel (STUDENT'a başlangıç dersleri atamak için — course_enrollment'a INSERT)
- Service: `user_service.create_user_as_admin(data)`
  - Email duplicate kontrol, student_no duplicate kontrol
  - Password `hash_password()` ile hashle
  - `User` create + `UserDepartment` link'leri + (varsa) `CourseEnrollment` insert
  - `log_activity(ActivityAction.USER_REGISTER, …)` (mevcut enum)
- Endpoint: `POST /api/v1/users` (ADMIN-only) — `user_controller.py`

**A4. Course teacher atama**
- `backend/app/features/course/course_dto.py` `CourseCreate`:
  ```python
  teacher_id: Optional[UUID] = Field(default=None, description="Sadece ADMIN doldurur")
  ```
- `course_service.create_course`:
  - `current_user.role == ADMIN and data.teacher_id` → o teacher'a ata, role doğrula (`UserRole.TEACHER`)
  - aksi durumda eski davranış (TEACHER kendi adına oluşturur — ama yetki kapatıldığı için bu kod yolu çalışmaz)

**A5. Teacher ders oluşturma yetkisi kapatılır**
- `backend/app/features/course/course_controller.py` POST `/courses` → `role_required([UserRole.ADMIN])`
- `backend/app/features/course/course_manager.py:validate_can_create_course` → `if user.role != ADMIN: ForbiddenException(...)`
- 403 hatası UI'da toast olarak gösterilecek (mevcut error handling yeterli).

---

### Paket B — Frontend Düzeltmeleri (~2 saat)

**B1. Department dropdown'unu çalıştır**
- `frontend/src/app/dashboard/courses/new/page.tsx:40` → URL `/api/v1/departments` (Paket A1 sonrası çalışır)
- `.catch(() => {})` → `.catch((err) => { toast.error("Bölümler yüklenemedi"); console.error(err); })` ile sessiz hatayı kaldır
- Aynı kontrol register sayfasında: `frontend/src/app/(auth)/register/page.tsx:49` — mevcut URL'i kontrol et, public endpoint'in zaten var olduğunu doğrula

**B2. Projects sayfasında admin için DRAFT exclude**
- `frontend/src/app/dashboard/projects/page.tsx:135` — `role === "TEACHER"` → `role !== "STUDENT"` (admin de exclude eder)
- Status filtresinde "Taslak" seçeneğini staff için gizle (zaten görmemeli)

**B3. Reports sayfası — "Taslak" hatası + admin için gizle**
- `frontend/src/app/dashboard/reports/page.tsx:512-515` status dropdown:
  - Staff için (`isStaff`) **"Taslak" option'u kaldır** (DRAFT zaten exclude edileceği için göstermenin anlamı yok)
  - Student için "Taslak" kalsın, ama **value'leri lowercase** yap: `"draft" | "submitted" | "reviewed"` (backend enum lowercase)
- `frontend/src/app/dashboard/reports/page.tsx:241`:
  - `setError(err.response?.data?.detail)` → array gelirse handle et:
    ```ts
    const detail = err.response?.data?.detail;
    const msg = typeof detail === "string" ? detail
      : Array.isArray(detail) ? detail.map(d => d.msg).join(", ")
      : "Raporlar yüklenemedi.";
    setError(msg);
    ```
- Aynı pattern projects/page.tsx error handling'inde de var → kontrol et

**B4. Students sayfası silinir + Sidebar güncellenir**
- Sil: `frontend/src/app/dashboard/students/page.tsx`, klasör boşalırsa klasör de sil
- Sidebar (`frontend/src/components/layout/Sidebar.tsx`):
  - TEACHER bölümünde "Öğrencilerim" linkini `/dashboard/users?role=STUDENT&onlyMine=true` query'siyle ana sayfaya yönlendir (veya basitçe "Öğrencilerim" linkini kaldır, teacher /dashboard/users'a girer)
  - ADMIN bölümünde "Öğrenciler" satırı kaldır (mevcut: satır 171)
- `users/page.tsx`: query param `role` ve `onlyMine` parse et — `my-students` endpoint'i `onlyMine=true` ile kullansın (teacher için), aksi `/api/v1/users` (admin için)

**B5. Admin "Yeni Kullanıcı Ekle" modal'ı**
- `frontend/src/app/dashboard/users/page.tsx`:
  - Sağ üstte yeni buton: `<Button onClick={() => setCreateModalOpen(true)}>Yeni Kullanıcı Ekle</Button>` (sadece admin)
  - Modal komponenti (aynı dosyada veya `frontend/src/components/users/AdminCreateUserModal.tsx` DRY için):
    - Rol seçici: Öğrenci | Öğretmen (radio)
    - Ortak alanlar: email, geçici şifre (min 8), first_name, last_name, department_ids (multi-select; **TEACHER için ≥1, STUDENT için ≥1**)
    - STUDENT ise ek: student_no (9 hane, `parseStudentNumber` ile canlı preview), class_section_id (opsiyonel, mevcut bölümün class_sections'larından dropdown), course_ids (mevcut courses'tan multi-select; opsiyonel)
    - Submit → `POST /api/v1/users` → başarıda liste yenilenir, toast
- Yeni dosya: `frontend/src/components/users/AdminCreateUserModal.tsx`

**B6. Course/new sayfası admin için teacher dropdown**
- `frontend/src/app/dashboard/courses/new/page.tsx`:
  - `role === "ADMIN"` ise yeni **"Öğretmen ata"** dropdown (zorunlu) — `/api/v1/users?role=TEACHER&size=200` ile listele
  - Submit body'ye `teacher_id` ekle
  - Teacher login'de bu sayfaya zaten erişemeyecek (Sidebar'dan link kaldırılır + backend 403)
- `frontend/src/components/layout/Sidebar.tsx`:
  - TEACHER bölümünden "Yeni Ders Ekle"yi kaldır (varsa)
  - Course list sayfasında "Yeni Ders" butonu yalnızca admin'e gösterilsin: `frontend/src/app/dashboard/courses/page.tsx`

---

## 🎯 Etkilenen Dosyalar (Özet)

### Backend (yeni & değişen)
| Dosya | İşlem |
|-------|-------|
| `backend/app/features/department/department_controller.py` | Yeni public GET `/api/v1/departments` |
| `backend/app/main.py` | Yeni router include (gerekirse) |
| `backend/app/features/project/project_service.py` | Staff için default DRAFT exclude |
| `backend/app/features/report/report_service.py` | Staff için default DRAFT exclude |
| `backend/app/features/user/user_dto.py` | `AdminCreateUserRequest` |
| `backend/app/features/user/user_service.py` | `create_user_as_admin()` |
| `backend/app/features/user/user_controller.py` | `POST /api/v1/users` (admin only) |
| `backend/app/features/course/course_dto.py` | `teacher_id: Optional[UUID]` |
| `backend/app/features/course/course_service.py` | Admin teacher_id override mantığı |
| `backend/app/features/course/course_manager.py` | TEACHER reject in `validate_can_create_course` |
| `backend/app/features/course/course_controller.py` | POST role_required: ADMIN only |

### Frontend (yeni & değişen, silinen)
| Dosya | İşlem |
|-------|-------|
| `frontend/src/app/dashboard/courses/new/page.tsx` | URL fix + admin teacher dropdown + error toast |
| `frontend/src/app/(auth)/register/page.tsx` | URL doğrula |
| `frontend/src/app/dashboard/projects/page.tsx` | role!=STUDENT exclude + status dropdown filtreleme |
| `frontend/src/app/dashboard/reports/page.tsx` | Lowercase status + "Taslak" admin/teacher için gizle + error handler array-safe |
| `frontend/src/app/dashboard/students/page.tsx` | **SİL** |
| `frontend/src/app/dashboard/users/page.tsx` | role/onlyMine query desteği + "Yeni Kullanıcı" butonu + modal kullanımı |
| `frontend/src/components/users/AdminCreateUserModal.tsx` | **YENİ** — admin user create form |
| `frontend/src/components/layout/Sidebar.tsx` | "Öğrenciler" linki kaldır (admin); TEACHER "Öğrencilerim" → /users yönlendir |
| `frontend/src/app/dashboard/courses/page.tsx` | "Yeni Ders" butonu admin-only |

### Migration
- **Migration gerekmez** (DB şeması değişmiyor; sadece endpoint + business logic).

---

## 🧪 Verification (End-to-End)

**Backend reload doğrula:**
```bash
docker logs unitrack-api --tail 20
```

**Admin akışı:**
1. Admin login → `/dashboard/courses/new` → **bölüm dropdown'da 3 bölüm** gözükmeli (web tasarım, grafik animasyon, Belirtilmemiş)
2. Admin "Yeni Ders" → öğretmen dropdown'unda mevcut TEACHER'lar → birini seç → kaydet → DB'de `teacher_id` o öğretmen olmalı
3. Admin `/dashboard/projects` → DRAFT projeler **gözükmemeli**; status dropdown'da "Taslak" seçeneği yok
4. Admin `/dashboard/reports` → "Taslak" seçeneği yok; "Teslim Edildi" / "İncelendi" tıklandığında **hata yok** (lowercase backend'e gidiyor)
5. Admin `/dashboard/users` → "Yeni Kullanıcı Ekle" butonu → modal
   - **Öğretmen ekle**: email + şifre + ad/soyad + bölüm seç → kaydet → liste güncellenir → o teacher login olabilir
   - **Öğrenci ekle**: yukarıdaki + student_no + bölüm + (varsa) ders → kayıt → preview parser canlı doğrular
6. Sidebar'da admin için **"Öğrenciler" linki YOK**, sadece "Tüm Kullanıcılar"

**Teacher akışı:**
1. Teacher login → Sidebar'da "Yeni Ders" linki yok → adres çubuğundan `/dashboard/courses/new` denese **403**
2. Teacher `/dashboard/courses` → sadece kendisine atanan dersler
3. Teacher `/dashboard/users` → "Öğrencilerim" başlığıyla `onlyMine=true` (kendi bölümünün öğrencileri)
4. Teacher `/dashboard/projects` ve `/dashboard/reports` → DRAFT yok

**Student akışı:**
1. Student `/dashboard/reports` → kendi DRAFT raporlarını görür (filtre Taslak çalışır)

**Otomatik testler:**
- `cd backend && python -m pytest tests/test_auth/test_auth_unit.py` (regression)
- TypeScript: `cd frontend && npx tsc --noEmit` (0 hata bekleniyor)

---

## ⚠️ Riskler & Notlar

1. **Var olan teacher-created dersler**: Migration gerekmez, ama mevcut DB'de teacher'ın kendi adına oluşturduğu dersler kalır — bu doğru davranış (geriye dönük uyumlu).
2. **Course'a teacher değiştirme (transfer)**: Bu paket sadece **create** flow'unu çözer. "Mevcut bir derse başka öğretmen ata" işlemi için sonradan bir update endpoint gerekirse Paket A4 ile genişletilir.
3. **Şifre güvenliği**: Admin formda şifre girer; **kullanıcıya ilk girişte şifre değiştir** uyarısı gösterme şu an kapsam dışı. İleride flag eklenebilir (`must_change_password`).
4. **Students sayfası silinince login geçmişinde direkt link tıklayan teacher'lar 404 alır** — Sidebar zaten yönlendirme yapıyor; eski URL'ler için `/dashboard/students` → `/dashboard/users?onlyMine=true` redirect (next.config.js `redirects()`) opsiyonel.
5. **Department public endpoint'i auth-required**: Login olmayan register sayfası mevcut public endpoint'i kullanmaya devam eder (kontrol gerekli) — yoksa register koparılır.

---

## 🚦 Uygulama Sırası

```
1. Backend A1 + A2 (department endpoint + DRAFT default exclude)  →  test
2. Backend A3 (admin user create)                                  →  test
3. Backend A4 + A5 (course teacher_id + role kapama)               →  test
4. Frontend B1 + B2 + B3 (URL fix, DRAFT gizle, status hatası)     →  test
5. Frontend B4 (students sayfası kaldır, sidebar update)           →  test
6. Frontend B5 (admin create user modal)                           →  test
7. Frontend B6 (course/new teacher dropdown, butonlar)             →  test
```

Her adım sonrası kullanıcı onayı (CLAUDE.md `Her Koddan Sonra Onay Al` kuralı).
