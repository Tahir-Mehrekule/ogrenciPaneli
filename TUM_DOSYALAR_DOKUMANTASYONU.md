# 📚 GitHub'a Gönderilecek Dosyalar — Dokümantasyon

GitHub'a commit edilmeyi bekleyen tüm dosyaların ne işe yaradığını açıklayan dokümandır.

---

## 🔄 DEĞİŞTİRİLEN DOSYALAR (Mevcut dosyalarda güncelleme)

---

### 1. `docker-compose.yml`
Docker ortam tanımı. Mevcut `db` (PostgreSQL) ve `api` (FastAPI) servislerine ek olarak **MinIO** (S3 uyumlu dosya depolama) servisi eklendi. MinIO, dosya yükleme/indirme işlemleri için 9000 ve 9001 portlarında çalışır.

---

### 2. `frontend/src/app/dashboard/page.tsx`
Dashboard ana sayfası. Kullanıcının rolüne göre farklı dashboard gösterir:
- `ADMIN` → `AdminDashboard` bileşeni
- `TEACHER` → `TeacherDashboard` bileşeni
- `STUDENT` → `StudentDashboard` bileşeni

---

### 3. `frontend/src/components/dashboard/StudentDashboard.tsx`
Öğrenci paneli bileşeni. Kullanıcıyı ismiyle karşılar. 3 istatistik kartı gösterir: Kayıtlı Dersler, Aktif Projeler, Bekleyen Görevler. Alt kısımda "Yaklaşan Rapor Teslimleri" bilgi kartı.

---

### 4. `frontend/src/components/dashboard/TeacherDashboard.tsx`
Öğretmen paneli bileşeni. 3 istatistik kartı: Verdiğim Dersler, Danışmanı Olduğum Projeler, Onay Bekleyenler. Alt kısımda "Onay Bekleyen Projeler" ve "Son Yüklenen Raporlar" kartları.

---

### 5. `frontend/src/components/layout/Sidebar.tsx`
Sol menü bileşeni. **Role göre farklı menü öğeleri** gösterir:
- **STUDENT**: Genel Bakış, Ders Kataloğu, Projelerim, Haftalık Raporlar
- **TEACHER**: Genel Bakış, Verdiğim Dersler, Gelen Projeler, Gelen Raporlar
- **ADMIN**: Sistem İstatistikleri, Ayarlar

Aktif sayfa indigo renkle vurgulanır. Alt kısımda giriş yapılan rol gösterilir.

---

### 6. `frontend/src/hooks/useAuth.ts`
Auth hook. `AuthContext`'e kolay erişim sağlar — `useAuth()` ile `user`, `login`, `register`, `logout` fonksiyonlarına ulaşılır.

---

### 7. `frontend/src/lib/apiClient.ts`
Merkezi API istemcisi. Tüm backend istekleri bu Axios instance'ı üzerinden yapılır.
- Cookie'deki token'ı her isteğe otomatik ekler (Request Interceptor)
- 401 hatada token'ları silip login'e yönlendirir (Response Interceptor)
- Base URL: `.env`'den okur, yoksa `localhost:19000`

---

### 8. `mobile/src/components/ui/Card.tsx`
Mobile kart bileşeni. React Native `View` ile oluşturulmuş, dark tema uyumlu kart yapısı.

---

### 9. `mobile/src/navigation/RootNavigator.tsx`
Mobile navigasyon yapısı. 3 katmanlı:
- **Kök Stack**: Giriş yapılmamışsa Login/Register, yapılmışsa ana sekme gösterir
- **Bottom Tab**: 5 sekme — Genel Bakış, Dersler, Projeler, Raporlar, Hesabım
- **İç Stack'ler**: Her sekmenin liste→detay→oluşturma alt sayfaları

Yeni eklenen Ders, Proje, Rapor ekranları bu navigasyona bağlandı.

---

### 10. `mobile/src/screens/dashboard/StudentDashboardScreen.tsx`
Mobile öğrenci paneli. Frontend'deki StudentDashboard'un React Native karşılığı.

---

### 11. `mobile/src/screens/dashboard/TeacherDashboardScreen.tsx`
Mobile öğretmen paneli. Frontend'deki TeacherDashboard'un React Native karşılığı.

---

### 12. `.claude/rules/project.md`
AI asistan kuralları dosyası. Proje yapısı ve kodlama standartlarını tanımlar.

---

## 🆕 YENİ DOSYALAR — Tip Tanımları

---

### 13. `mobile/src/types/course.ts`
Ders modülü TypeScript tipleri. `Course` (ders modeli), `CourseCreate` (oluşturma isteği) ve `PaginatedResponse<T>` (sayfalı API yanıtı) interface'lerini tanımlar.

---

### 14. `mobile/src/types/project.ts`
Proje ve görev modülü tipleri. `Project`, `ProjectCreate`, `Task`, `TaskCreate` interface'leri. Durum sabitleri: `ProjectStatus` (DRAFT/PENDING/APPROVED/REJECTED), `TaskStatus` (TODO/IN_PROGRESS/DONE).

---

### 15. `mobile/src/types/report.ts`
Rapor modülü tipleri. `Report`, `ReportCreate`, `ReviewRequest` interface'leri. `ReportStatus`: DRAFT→SUBMITTED→REVIEWED akışı.

---

## 🆕 YENİ DOSYALAR — Frontend (Web) Sayfaları

---

### 16. `frontend/src/app/dashboard/courses/page.tsx`
**Ders listesi sayfası.** API'den dersleri çeker ve kart grid'i ile gösterir.
- **TEACHER**: "Yeni Ders Oluştur" butonu görünür
- **STUDENT**: Her derste "Kayıt Ol" butonu görünür (kaydolma API çağrısı yapar)
- Boş durum ve hata mesajları ayrı gösterilir

---

### 17. `frontend/src/app/dashboard/courses/new/page.tsx`
**Yeni ders oluşturma formu.** Ders Adı, Ders Kodu (otomatik büyük harfe çevirir), Dönem alanları. POST `/api/v1/courses` endpoint'ine istek atar, başarılıysa ders listesine yönlendirir.

---

### 18. `frontend/src/app/dashboard/projects/page.tsx`
**Proje listesi sayfası.** Projeleri renkli durum etiketleriyle gösterir (Taslak=gri, Bekliyor=amber, Onaylı=yeşil, Reddedildi=kırmızı). Karta tıklanınca proje detayına gider.
- **STUDENT**: "Yeni Proje" butonu
- **TEACHER**: Bekleyen projelerde "Onayla" / "Reddet" butonları

---

### 19. `frontend/src/app/dashboard/projects/new/page.tsx`
**Yeni proje oluşturma formu.** Başlık (min 3 karakter), Açıklama (min 10 karakter), Ders seçimi (opsiyonel dropdown — mevcut dersleri API'den çeker). Proje TASLAK statüsünde başlar.

---

### 20. `frontend/src/app/dashboard/projects/[id]/page.tsx`
**Proje detay sayfası.** En kapsamlı sayfa — proje bilgisi + Kanban board görev yönetimi.
- **Proje kartı**: Başlık, açıklama, durum etiketi
- **Aksiyon butonları**: Öğrenci="Onaya Gönder" (DRAFT'ta), Öğretmen="Onayla/Reddet" (PENDING'te)
- **Görev ekleme**: Mini form ile yeni görev oluşturma
- **Kanban kolonları**: Yapılacak / Devam Ediyor / Tamamlandı — 3 kolon
- **Durum değiştirme**: Göreve tıklayınca TODO→IN_PROGRESS→DONE döngüsü
- **AI etiketi**: Yapay zeka tarafından önerilen görevlere 🤖 işareti

---

### 21. `frontend/src/app/dashboard/reports/page.tsx`
**Rapor listesi sayfası.** Haftalık raporları durum etiketleriyle listeler (Taslak/Teslim Edildi/İncelendi). YouTube video linki ve öğretmen değerlendirme notu gösterir.
- **STUDENT**: "Yeni Rapor" butonu + DRAFT raporlarda "Teslim Et" butonu
- **TEACHER**: Gelen raporları görüntüler

---

### 22. `frontend/src/app/dashboard/reports/new/page.tsx`
**Yeni rapor oluşturma formu.** Proje seçimi (zorunlu dropdown), içerik alanı (min 20 karakter — canlı karakter sayacı), YouTube video linki (opsiyonel). Rapor TASLAK olarak başlar, hafta/yıl otomatik belirlenir.

---

## 🆕 YENİ DOSYALAR — Mobile Ekranları

---

### 23. `mobile/src/screens/courses/CourseListScreen.tsx`
**Mobile ders listesi.** FlatList ile dersleri listeler. Öğretmenler "Yeni Ders" butonu ile oluşturma ekranına geçer, öğrenciler "Kayıt Ol" butonu ile derse kaydolur.

---

### 24. `mobile/src/screens/courses/CourseCreateScreen.tsx`
**Mobile ders oluşturma.** Ders adı, kodu ve dönem alanlarıyla form. Frontend'deki `courses/new/page.tsx` ile aynı mantık, React Native bileşenleri ile.

---

### 25. `mobile/src/screens/projects/ProjectListScreen.tsx`
**Mobile proje listesi.** Projeleri renkli durum etiketleriyle FlatList'te gösterir. Karta basınca proje detayına navigate eder.

---

### 26. `mobile/src/screens/projects/ProjectCreateScreen.tsx`
**Mobile proje oluşturma.** Başlık, açıklama ve ders seçimi formu. Frontend'deki `projects/new/page.tsx` ile aynı mantık.

---

### 27. `mobile/src/screens/projects/ProjectDetailScreen.tsx`
**Mobile proje detayı.** Proje bilgisi + görev listesi. Durum değiştirme, onaylama/reddetme işlemleri. Frontend'deki `projects/[id]/page.tsx` ile aynı mantık.

---

### 28. `mobile/src/screens/projects/TaskCreateScreen.tsx`
**Mobile görev oluşturma.** Bir projeye yeni görev eklemek için form: Başlık, açıklama, son tarih (opsiyonel).

---

### 29. `mobile/src/screens/reports/ReportListScreen.tsx`
**Mobile rapor listesi.** Haftalık raporları durum etiketleriyle listeler. Teslim etme ve öğretmen notu gösterimi.

---

### 30. `mobile/src/screens/reports/ReportCreateScreen.tsx`
**Mobile rapor oluşturma.** Proje seçimi, haftalık çalışma içeriği ve YouTube linki ile rapor oluşturma formu.

---

## 📊 Özet Tablo

| # | Dosya | Durum | Ne İşe Yarar |
|---|---|---|---|
| 1 | `docker-compose.yml` | Değiştirildi | MinIO servisi eklendi |
| 2 | `dashboard/page.tsx` | Değiştirildi | Role göre panel yönlendirmesi |
| 3 | `StudentDashboard.tsx` | Değiştirildi | Öğrenci istatistik paneli |
| 4 | `TeacherDashboard.tsx` | Değiştirildi | Öğretmen istatistik paneli |
| 5 | `Sidebar.tsx` | Değiştirildi | Role göre menü öğeleri |
| 6 | `useAuth.ts` | Değiştirildi | Auth hook |
| 7 | `apiClient.ts (web)` | Değiştirildi | API istemcisi |
| 8 | `Card.tsx (mobile)` | Değiştirildi | Mobile kart bileşeni |
| 9 | `RootNavigator.tsx` | Değiştirildi | Yeni ekranlar navigasyona eklendi |
| 10 | `StudentDashboardScreen.tsx` | Değiştirildi | Mobile öğrenci paneli |
| 11 | `TeacherDashboardScreen.tsx` | Değiştirildi | Mobile öğretmen paneli |
| 12 | `project.md` | Değiştirildi | AI asistan kuralları |
| 13 | `course.ts (type)` | Yeni | Ders tip tanımları |
| 14 | `project.ts (type)` | Yeni | Proje/görev tip tanımları |
| 15 | `report.ts (type)` | Yeni | Rapor tip tanımları |
| 16 | `courses/page.tsx` | Yeni | Web ders listesi |
| 17 | `courses/new/page.tsx` | Yeni | Web ders oluşturma |
| 18 | `projects/page.tsx` | Yeni | Web proje listesi |
| 19 | `projects/new/page.tsx` | Yeni | Web proje oluşturma |
| 20 | `projects/[id]/page.tsx` | Yeni | Web proje detayı + Kanban |
| 21 | `reports/page.tsx` | Yeni | Web rapor listesi |
| 22 | `reports/new/page.tsx` | Yeni | Web rapor oluşturma |
| 23 | `CourseListScreen.tsx` | Yeni | Mobile ders listesi |
| 24 | `CourseCreateScreen.tsx` | Yeni | Mobile ders oluşturma |
| 25 | `ProjectListScreen.tsx` | Yeni | Mobile proje listesi |
| 26 | `ProjectCreateScreen.tsx` | Yeni | Mobile proje oluşturma |
| 27 | `ProjectDetailScreen.tsx` | Yeni | Mobile proje detayı |
| 28 | `TaskCreateScreen.tsx` | Yeni | Mobile görev oluşturma |
| 29 | `ReportListScreen.tsx` | Yeni | Mobile rapor listesi |
| 30 | `ReportCreateScreen.tsx` | Yeni | Mobile rapor oluşturma |
