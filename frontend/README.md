# 🌐 UniTrack AI — Web Frontend

UniTrack AI'ın tarayıcı üzerinden erişilen yönetim panelidir. Öğrenci, öğretmen ve admin rollerine göre farklı arayüzler sunar.

---

## 🛠 Tech Stack

| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| Next.js | 16.1.7 | React framework (App Router) |
| React | 19.2.3 | UI kütüphanesi |
| TypeScript | ^5 | Tip güvenliği |
| TailwindCSS | ^4 | Utility-first CSS |
| Axios | ^1.13.6 | HTTP istemcisi |
| lucide-react | ^0.577.0 | İkon kütüphanesi |
| js-cookie | ^3.0.5 | Cookie yönetimi (JWT token) |
| react-hot-toast | ^2.6.0 | Bildirim toast'ları |

---

## 📁 Proje Yapısı

```
frontend/src/
├── app/
│   ├── (auth)/                → Kimlik doğrulama sayfaları
│   │   ├── login/             → Giriş sayfası
│   │   └── register/          → Kayıt sayfası
│   ├── dashboard/             → Ana panel
│   │   ├── page.tsx           → Role göre dashboard yönlendirme
│   │   ├── layout.tsx         → Dashboard layout (Sidebar + Header)
│   │   ├── admin/             → Admin yönetim sayfaları
│   │   ├── courses/           → Ders listesi ve oluşturma
│   │   ├── pending-students/  → Onay bekleyen öğrenciler
│   │   ├── projects/          → Proje listesi, detay, Kanban board
│   │   ├── reports/           → Haftalık rapor listesi ve oluşturma
│   │   ├── settings/          → Ayarlar
│   │   ├── students/          → Öğrenci yönetimi
│   │   └── users/             → Kullanıcı yönetimi
│   ├── globals.css            → Tailwind global stiller
│   ├── layout.tsx             → Root layout
│   └── page.tsx               → Ana giriş noktası (login'e yönlendirir)
├── components/
│   ├── courses/               → Ders bileşenleri
│   ├── dashboard/             → StudentDashboard, TeacherDashboard, AdminDashboard
│   ├── layout/                → Sidebar, Header vb.
│   └── ui/                    → Ortak UI bileşenleri (Button, Card, Modal vb.)
├── context/                   → AuthContext (React Context API)
├── hooks/                     → useAuth vb. custom hook'lar
├── lib/                       → apiClient (Axios instance + interceptor)
├── services/                  → API servis fonksiyonları
└── types/                     → TypeScript tip tanımları
```

---

## 🚀 Nasıl Çalıştırılır

```bash
# 1. Frontend klasörüne gir
cd frontend

# 2. Bağımlılıkları yükle
npm install

# 3. Geliştirici sunucusunu başlat
npm run dev
```

Tarayıcıda açılacak adres: **http://localhost:3000**

> ⚠️ Backend API'nin çalışıyor olması gerekir. API adresi `.env` dosyasından veya varsayılan olarak `http://localhost:19000` üzerinden okunur.

---

## 👥 Rol Bazlı Arayüzler

| Rol | Gördüğü Sayfalar |
|-----|-------------------|
| **STUDENT** | Genel Bakış, Derslerim, Projelerim, Haftalık Raporlar |
| **TEACHER** | Genel Bakış, Verdiğim Dersler, Gelen Projeler, Gelen Raporlar |
| **ADMIN** | Sistem İstatistikleri, Kullanıcı Yönetimi, Ayarlar, Bölümler |

---

## 🔗 Backend Bağlantısı

Frontend, `lib/apiClient.ts` üzerinden merkezi bir Axios instance'ı kullanır:
- Cookie'deki JWT token'ı her isteğe otomatik ekler (Request Interceptor)
- 401 hatada token'ları silip login sayfasına yönlendirir (Response Interceptor)
- Base URL: `.env`'den okur, yoksa `localhost:19000`
