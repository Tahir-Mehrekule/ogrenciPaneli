# 📋 UNITRACK AI — ÖĞRETMEN & ADMİN PANELİ İYİLEŞTİRME PLANI

> Tarih: 2026-05-17
> Kapsam: Öğretmen paneli ve Admin paneli için toplu iyileştirme paketi
> Kural: Her bölüm tamamlandığında onay alınacak. Mühendislik prensipleri için bkz. `.claude/rules/project.md`

---

## 🎯 GENEL ÖZET

Bu plan, öğretmen ve admin panellerinde tespit edilen 16 ayrı iyileştirme isteğini 4 mantıksal gruba ayırıyor. Her grup kendi içinde tutarlı, bağımsız test edilebilir ve onay alınabilir bir iş paketidir.

### Çalışma Prensibi
1. Her grup başlamadan önce **somut adım listesi** çıkar
2. Backend değişiklikleri için **migration scripti** hazırla, çalıştırmadan önce göster
3. Frontend değişiklikleri için **küçük, gözden geçirilebilir commit'ler**
4. Her commit sonrası **onay bekle**
5. Test coverage zorunlu (controller + service düzeyinde)

---

## 🗂️ GRUP A — Hızlı UI Düzenlemeleri (Frontend-only)

**Amaç:** Backend dokunmadan yapılabilecek tüm UI düzeltmeleri. En düşük risk, en hızlı sonuç.

### A1. Yeni Ders Sayfası — Dropdown'lar
**Mevcut durum:** `frontend/src/app/dashboard/courses/new/page.tsx` — dönem, sınıf, şube alanları text input (varsayım, dosya okunacak).

**Yapılacak:**
- **Dönem** → Dropdown (`Güz`, `Bahar`, `Yaz`)
- **Sınıf** → Dropdown (`1. Sınıf`, `2. Sınıf`, `3. Sınıf`, `4. Sınıf`)
- **Şube** → Dropdown (`A`, `B`, `C`, `D` — sabit liste veya ileride departmandan)

**Etkilenen dosyalar:**
- `frontend/src/app/dashboard/courses/new/page.tsx`
- `frontend/src/constants/` altına `course_options.ts` (DRY)

**Tahmini efor:** 1 saat
**Risk:** Düşük

---

### A2. "Verdiğim Dersler" → "Tüm Dersler"
**Mevcut durum:** Öğretmen panelinde başlık/etiket "Verdiğim Dersler" olarak geçiyor.

**Yapılacak:** Tüm görüntülenen yerlerde başlık güncelle. Sidebar/menu, sayfa başlığı, breadcrumb.

**Etkilenen dosyalar:**
- `frontend/src/components/` (Sidebar)
- `frontend/src/app/dashboard/courses/page.tsx`

**Tahmini efor:** 15 dakika
**Risk:** Çok düşük

---

### A3. Tablo Kolonlarının Tümünün Sıralanabilir Olması
**Mevcut durum:** Gelen projeler tablosunda "Proje Adı" ve "Tarih" sıralanabilir; **Öğrenci**, **Ders**, **Durum** kolonları tıklanamıyor.

**Yapılacak:**
- Tüm tablolarda kolon başlıklarına sort handler ekle
- `useSortableTable` hook'u oluştur (DRY — `frontend/src/hooks/`)
- Sort yön ikonu (↑/↓) göster

**Etkilenen dosyalar:**
- `frontend/src/hooks/useSortableTable.ts` (yeni)
- `frontend/src/app/dashboard/projects/page.tsx`
- `frontend/src/app/dashboard/reports/page.tsx`
- `frontend/src/app/dashboard/students/page.tsx`

**Tahmini efor:** 3 saat
**Risk:** Düşük

---

### A4. Öğrencilerim — Tek Search Bar (Ad/Soyad/Email/Öğrenci No)
**Mevcut durum:** Sadece ad/soyad veya email arıyor, öğrenci no aranmıyor.

**Yapılacak:**
- Tek input, frontend'de tüm alanlarda case-insensitive `includes` araması
- Placeholder: "Ad, soyad, e-posta veya öğrenci no ile ara..."
- Backend filter parametresine `q` (genel arama) ekle (Grup B'de detay)

**Etkilenen dosyalar:**
- `frontend/src/app/dashboard/students/page.tsx`
- `backend/app/features/user/user_repo.py` (Grup B'de)

**Tahmini efor:** 1 saat (frontend) + 30 dk (backend, Grup B)
**Risk:** Düşük

---

### A5. Gelen Projelerde Filtreleme Eksiklerinin Tamamlanması
**Mevcut durum:** Bazı filtre alanları çalışıyor, bazıları çalışmıyor (Öğrenci, Ders, Durum).

**Yapılacak:**
- Tüm filtre alanlarını çalışır hale getir
- URL query string ile filtre state'i (paylaşılabilir link)
- "Filtreyi Temizle" butonu

**Etkilenen dosyalar:**
- `frontend/src/app/dashboard/projects/page.tsx`

**Tahmini efor:** 2 saat
**Risk:** Düşük

---

### A6. Taslak Projelerin Öğretmen Panelinden Gizlenmesi
**Mevcut durum:** `DRAFT` statusündeki projeler de listeye dahil oluyor.

**Yapılacak:**
- Öğretmen view'unda default filter: `status != DRAFT`
- Backend tarafında da bir guard (öğretmen, kendi projesi olmayan DRAFT göremez)
- Admin tüm statusları görebilir

**Etkilenen dosyalar:**
- `frontend/src/app/dashboard/projects/page.tsx` (frontend filter)
- `backend/app/features/project/project_service.py` (backend filter — Grup B'de)

**Tahmini efor:** 1 saat
**Risk:** Düşük (ama yetkilendirme dikkat gerektirir)

---

### A7. Sınıf-Bazlı Sekmeler (1./2./3./4. Sınıf)
**Mevcut durum:** Proje/rapor listelerinde sınıf bazlı gruplama yok.

**Yapılacak:**
- Üst sekmeler: `Tümü | 1. Sınıf | 2. Sınıf | 3. Sınıf | 4. Sınıf`
- Her sekmede:
  - Toplam öğrenci sayısı
  - Şube sayısı (örn: "A, B şubeleri — 47 öğrenci")
  - "Tüm Şubeler Görünümü" toggle
- Veri kaynağı: öğrencinin enrollment'i veya öğrenci no'sundaki sınıf kodu (Grup C'ye bağlı)

**Etkilenen dosyalar:**
- `frontend/src/components/ClassTabs.tsx` (yeni)
- `frontend/src/app/dashboard/projects/page.tsx`
- `frontend/src/app/dashboard/reports/page.tsx`

**Tahmini efor:** 4 saat
**Risk:** Orta (Grup C'deki bölüm kodu yapısına bağımlı)

---

**🔵 Grup A toplam tahmini efor:** ~12 saat
**🔵 Grup A bağımlılıkları:** A7, Grup C'nin tamamlanmasına bağlı.

---

## 🗄️ GRUP B — Backend Şeması + İlişkili UI

**Amaç:** Şema değişiklikleri gerektiren özellikler. Migration zorunlu, dikkatli ilerlenmeli.

### B1. Projelere GitHub Linki (Opsiyonel)
**Yapılacak:**
- **Migration:** `projects` tablosuna `github_url VARCHAR(500) NULL`
- **DTO:** `ProjectCreate`, `ProjectUpdate`, `ProjectResponse` güncelle
- **Validation:** GitHub URL regex (`^https?://github\\.com/.+`)
- **Frontend:** Proje oluşturma formuna opsiyonel alan + listede ikon

**Etkilenen dosyalar:**
- `backend/alembic/versions/XXX_add_github_url_to_projects.py`
- `backend/app/features/project/project_model.py`
- `backend/app/features/project/project_dto.py`
- `backend/app/features/project/project_manager.py` (URL validasyonu)
- `frontend/src/app/dashboard/projects/new/page.tsx`
- `frontend/src/app/dashboard/projects/[id]/page.tsx`

**Tahmini efor:** 2 saat
**Risk:** Düşük

---

### B2. Proje Reddetme — Sebep Textbox
**Mevcut durum:** Projeyi reddetme butonu var ama sebep yok.

**Yapılacak:**
- **Migration:** `projects.rejection_reason TEXT NULL`
- **DTO:** `ProjectRejectRequest { reason: str }` (min 10 karakter)
- **Endpoint:** `POST /projects/{id}/reject` body olarak reason alır
- **Frontend:** Modal ile textarea (min 10 karakter validation)
- **Öğrenciye gösterim:** Reddedilen projenin detay sayfasında öğretmen notu

**Etkilenen dosyalar:**
- `backend/alembic/versions/XXX_add_rejection_reason.py`
- `backend/app/features/project/project_model.py`
- `backend/app/features/project/project_dto.py`
- `backend/app/features/project/project_service.py`
- `backend/app/features/project/project_controller.py`
- `frontend/src/app/dashboard/projects/page.tsx` (modal)
- `frontend/src/app/dashboard/projects/[id]/page.tsx` (sebep gösterimi)

**Tahmini efor:** 3 saat
**Risk:** Düşük

---

### B3. Raporlara Öğretmen Cevabı
**Yapılacak:**
- **Migration:** `reports` tablosuna:
  - `teacher_feedback TEXT NULL`
  - `teacher_reviewed_at TIMESTAMP NULL`
  - `teacher_reviewed_by UUID NULL FK→users`
- **DTO:** `ReportFeedbackRequest { feedback: str }`
- **Endpoint:** `POST /reports/{id}/feedback`
- **Frontend:**
  - Rapor detay sayfasında "Geri Bildirim Ver" butonu
  - Textarea + "AI ile Öner" butonu (Grup D'de yapılacak)
  - Cevap verilmişse "Düzenle" modu

**Etkilenen dosyalar:**
- `backend/alembic/versions/XXX_add_teacher_feedback_to_reports.py`
- `backend/app/features/report/report_model.py`
- `backend/app/features/report/report_dto.py`
- `backend/app/features/report/report_service.py`
- `backend/app/features/report/report_controller.py`
- `frontend/src/app/dashboard/reports/[id]/page.tsx`

**Tahmini efor:** 4 saat
**Risk:** Orta

---

### B4. Soft Delete (Proje / Rapor / Öğrenci)
**Mevcut durum:** `is_active` kolonu zaten `base_model.py` üzerinden tüm tablolarda mevcut. Endpoint'ler eksik veya hard delete yapıyor.

**Yapılacak:**
- **Backend:** `delete` endpoint'leri hard delete yerine `is_active = False` yapsın
- **Repository:** Tüm `get_*` metodları default `is_active = True` filtresi
- **Admin için:** `?include_deleted=true` parametresi
- **Yetki matrisi:**
  - Öğretmen: kendi dersindeki proje/rapor + öğrencilerini soft delete
  - Admin: hepsi + hard delete + restore

**Etkilenen dosyalar:**
- `backend/app/common/base_repo.py` (zaten var, kontrol)
- `backend/app/features/project/project_service.py`
- `backend/app/features/report/report_service.py`
- `backend/app/features/user/user_service.py`
- `backend/app/core/dependencies.py` (rol kontrolü)
- Frontend: silme butonlarına onay modalı

**Tahmini efor:** 5 saat
**Risk:** Yüksek (yetkilendirme hatası veri kaybına neden olabilir)

---

### B5. Departments Tablosu + Bölüm Kodu Sistemi
**Yapılacak:**
- **Yeni feature:** `backend/app/features/department/`
  - `department_model.py`: `id, code(3 hane), name, created_at, updated_at, is_active`
  - `department_dto.py`
  - `department_repo.py`
  - `department_service.py`
  - `department_controller.py` (admin yetkili)
- **Migration:**
  - `departments` tablosu oluştur
  - `users` tablosuna `department_id UUID NULL FK` (mevcut `department` string alanı geriye dönük olarak migrate edilecek)
  - `courses` tablosuna `department_id UUID NOT NULL FK`
- **Validation:** `code` 3 hane, unique
- **Frontend:**
  - Admin → Ayarlar → "Tüm Bölümler" sekmesi (ana sekme)
  - Bölüm ekleme: ad + kod (3 hane)
  - Bölüm listesi, düzenleme, silme

**Etkilenen dosyalar:**
- `backend/app/features/department/*` (yeni)
- `backend/alembic/versions/XXX_create_departments.py`
- `backend/app/features/user/user_model.py`
- `backend/app/features/course/course_model.py`
- `frontend/src/app/dashboard/admin/departments/page.tsx` (yeni)

**Tahmini efor:** 6 saat
**Risk:** Yüksek (mevcut user.department string verisi migration ile bölünmeli)

---

### B6. Ders Eklemede Bölüm Zorunlu
**Yapılacak (B5'e bağımlı):**
- `courses.department_id` NOT NULL
- Ders oluşturma formunda bölüm dropdown'ı (B5'teki departments'dan beslenir)
- Backend validation: department_id geçerli mi?

**Etkilenen dosyalar:**
- `backend/app/features/course/course_dto.py`
- `backend/app/features/course/course_service.py`
- `frontend/src/app/dashboard/courses/new/page.tsx`

**Tahmini efor:** 2 saat (B5 tamamlandıktan sonra)
**Risk:** Düşük

---

**🟢 Grup B toplam tahmini efor:** ~22 saat
**🟢 Grup B kritik nokta:** Migration sırası — B5 → B6 sırası zorunlu.

---

## 🔢 GRUP C — Öğrenci No Format Sistemi (Esnek)

**Karar:** Format **esnek** — sadece yeni kayıtlarda öneri/öneri, zorunlu değil.

### C1. Öğrenci No Format Yardımcısı
**Format mantığı:** `YYY-BBB-CCC` (9 hane)
- `YYY`: Giriş yılı kodu (245 → 2024-2025)
- `BBB`: Bölüm kodu (departments.code)
- `CCC`: Sınıf/sıra numarası

**Yapılacak:**
- **Backend:**
  - `app/common/validators.py` içine `parse_student_number(number) -> dict | None`
    - Format uyuyorsa `{entry_year, department_code, sequence}` döner
    - Uymuyorsa `None`
  - User repo'ya `search_by_student_number` (kısmi eşleşme)
- **Frontend (kayıt formu):**
  - Öğrenci no inputu yanında "ℹ️ Format önerisi: YYY-BBB-CCC (örn: 245235023)"
  - Girilen no parse edilebiliyorsa altında otomatik gösterim:
    > "Tespit edilen: 2024-2025 girişli, Web Tasarım ve Kodlama, 023 numara"
  - Zorunlu DEĞİL — kullanıcı istediği formatı girebilir

**Etkilenen dosyalar:**
- `backend/app/common/validators.py`
- `frontend/src/app/(auth)/register/page.tsx` (varsayım — kayıt sayfası)
- `frontend/src/lib/student_number_parser.ts` (yeni)

**Tahmini efor:** 3 saat
**Risk:** Düşük

---

### C2. Sınıf Filtrelemesi (Öğrenci No'ya Göre)
**Yapılacak:**
- Öğrencinin sınıfını öğrenci no'sundan parse et (parse edilemiyorsa "Bilinmiyor")
- Proje/rapor/öğrenci listelerinde sınıf sekmesi (Grup A7 ile birleşik)

**Etkilenen dosyalar:**
- A7 ile aynı

**Tahmini efor:** A7 içinde — ekstra 1 saat
**Risk:** Düşük

---

**🟡 Grup C toplam tahmini efor:** ~4 saat
**🟡 Grup C bağımlılıkları:** B5 (departments tablosu) tamamlanmış olmalı.

---

## 🤖 GRUP D — Karmaşık Özellikler

### D1. AI Rapor Cevap Önerisi
**Yapılacak:**
- **Backend:**
  - `POST /ai/suggest-feedback` endpoint
  - Input: `{ report_id, tone: "constructive" | "encouraging" | "critical" }`
  - Output: `{ suggested_feedback: str }`
  - `app/features/ai/ai_prompts.py` içine yeni prompt template
- **Frontend:**
  - Rapor cevap modalında "✨ AI ile Öner" butonu
  - Buton tıklanınca loading state, dönen metin textarea'ya yerleştir
  - Öğretmen düzenleyebilir, kabul edebilir

**Etkilenen dosyalar:**
- `backend/app/features/ai/ai_controller.py`
- `backend/app/features/ai/ai_service.py`
- `backend/app/features/ai/ai_prompts.py`
- `backend/app/features/ai/ai_dto.py`
- `frontend/src/app/dashboard/reports/[id]/page.tsx`

**Tahmini efor:** 4 saat
**Risk:** Orta (token kullanımı, rate limit)

---

### D2. Bildirim Sistemi — İncelenmemiş Rapor Uyarısı
**🟠 Onayınız bekleniyor:** Bildirim sistemi Faz 3'tü. İki opsiyon:

#### Opsiyon A — Tam Bildirim Sistemi (Önerilen)
- **Yeni feature:** `notification/`
- `notifications` tablosu (`id, user_id, title, message, type, is_read, related_entity_type, related_entity_id, created_at`)
- API: `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/mark-all-read`
- UI: Header'da bell ikonu, dropdown ile son 10 bildirim
- **Scheduler:** Her Pazartesi 09:00'da geçen hafta incelenmemiş raporlar için bildirim üret (cron/APScheduler)

#### Opsiyon B — Sadece UI İşareti (Minimal)
- Backend'de scheduler/notification yok
- Sadece rapor listesinde:
  - Geçen haftanın incelenmemiş raporlarının yanında 🔴 nokta
  - Üst banner: "Bu hafta 3 rapor incelenmedi"

#### Opsiyon C — Şimdi Atla
- Sadece UI'da işaret (Opsiyon B'nin minimum hali)
- Faz 3'te full sistem

**Tahmini efor:** A: 8 saat | B: 2 saat | C: 30 dk
**Risk:** A: Yüksek (scheduler altyapısı) | B/C: Düşük

> **Önerilen:** Opsiyon B — Tam scheduler altyapısı kurmadan kullanıcıya değer ver. Faz 3'te A'ya genişletilir.

---

### D3. Admin Paneli — Salt-Okunur Görünüm (Tüm Veriler)
**Yapılacak:**
- Admin sidebar'a yeni linkler:
  - "Tüm Dersler" (read-only, filtrelenebilir)
  - "Tüm Görevler" (read-only, filtrelenebilir)
  - "Tüm Raporlar" (read-only, filtrelenebilir)
  - "Tüm Öğrenciler" (read-only, filtrelenebilir, sadece soft/hard delete butonları)
- **Yetki:** Admin ekleme/düzenleme YAPAMAZ, sadece görüntüler ve siler
- **Frontend:** Mevcut sayfaları admin için read-only mode'da göster veya ayrı sayfalar

**Etkilenen dosyalar:**
- `frontend/src/app/dashboard/admin/courses/page.tsx` (yeni)
- `frontend/src/app/dashboard/admin/tasks/page.tsx` (yeni)
- `frontend/src/app/dashboard/admin/reports/page.tsx` (yeni)
- `frontend/src/app/dashboard/admin/students/page.tsx` (yeni)
- `frontend/src/components/Sidebar.tsx` (admin menü)

**Tahmini efor:** 6 saat
**Risk:** Düşük

---

**🔴 Grup D toplam tahmini efor:** ~12-18 saat (D2 seçimine göre)

---

## 📊 GENEL TAHMİN VE SIRALAMA

| Grup | Tahmini Efor | Risk | Bağımlılık |
|------|---------------|------|------------|
| A    | ~12 saat      | Düşük | A7 → C bağımlı |
| B    | ~22 saat      | Orta-Yüksek | B5 → B6 sıralı |
| C    | ~4 saat       | Düşük | B5'e bağımlı |
| D    | ~12-18 saat   | Orta-Yüksek | B3 → D1 bağımlı |
| **TOPLAM** | **~50-56 saat** | — | — |

---

## 🚦 ÖNERİLEN UYGULAMA SIRASI

```
1️⃣ Grup A (A1, A2, A3, A4, A5, A6) — Hızlı kazanımlar, A7 hariç
   ↓
2️⃣ Grup B5 (Departments tablosu) — Diğer her şeyin temeli
   ↓
3️⃣ Grup B1, B2, B3, B6 — İlişkili backend özellikleri
   ↓
4️⃣ Grup C (Öğrenci no parser) — Sınıf bilgisi gerekli
   ↓
5️⃣ Grup A7 (Sınıf sekmeleri) — C tamamlanınca
   ↓
6️⃣ Grup B4 (Soft delete) — En riskli, izole halde
   ↓
7️⃣ Grup D1 (AI cevap önerisi)
   ↓
8️⃣ Grup D3 (Admin read-only) — Bağımsız
   ↓
9️⃣ Grup D2 (Bildirim sistemi) — Karar bekliyor
```

---

## ❓ ONAY BEKLEYEN KARARLAR

Bu plan onaylanmadan ve aşağıdaki sorular netleşmeden kod yazılmayacak:

1. **D2 (Bildirim Sistemi):** A, B, C opsiyonlarından hangisi?
2. **Şube sistemi:** Şubeler nereden geliyor? Sabit liste mi (A/B/C/D), departments tablosundan mı, ayrı `class_sections` tablosu mu?
3. **Migration stratejisi:** Mevcut `users.department` (string) verisi nasıl `departments` tablosuna migrate edilecek? Manuel mi, otomatik script mi?
4. **Soft delete UX:** Silinen öğrenciye verilen projeler/raporlar ne olur? Cascade soft delete mi, orphan mı kalır?
5. **Admin "tüm öğrenciler" sayfasında hard delete butonu olsun mu** yoksa sadece soft delete + restore mu?

---

## ✅ SONRAKİ ADIM

Plan onaylanırsa **Grup A'dan başlanacak**. Her commit öncesi:
- Etkilenen dosyaların okunması
- Mevcut testlerin gözden geçirilmesi
- Değişiklikten sonra yeni test yazılması
- Onay alınması

> Bu doküman canlı bir doküman — geri bildirim aldıkça güncellenecek.
