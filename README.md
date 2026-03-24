# UniTrack AI

Öğrenci ve öğretmenlerin üniversite düzeyindeki projelerini, kanban tahtalarını ve raporlama süreçlerini AI (Yapay Zeka) destekli olarak yönetebileceği modern, modüler Proje Yönetim Sistemi.

Proje 3 temel yapıdan (Backend, Web Frontend, ve Mobil) oluşmaktadır:

## 1. Backend API (FastAPI + PostgreSQL + MinIO)
Projenin beyni ve veritabanı yatağıdır.
- Gerekli klasör: `/backend` ve `docker-compose.yml`
- **Nasıl Çalıştırılır:** Proje ana dizinindeyken terminale `docker compose up -d` yazmanız yeterlidir. Bütün veritabanı (Postgres), depolama (MinIO) ve API (FastAPI) ayağa kalkacaktır.
- API Adresi: `http://localhost:8000/docs`

## 2. Web Frontend (Next.js + TailwindCSS)
Tarayıcı üzerinden erişilen bilgisayar (Web) kontrol panelidir. 
- Gerekli klasör: `/frontend`
- **Nasıl Çalıştırılır:** `cd frontend` klasörüne girip terminale `npm run dev` yazınız. Next geliştirici sunucusu çalışacaktır.
- Local Adres: `http://localhost:3000`

## 3. Mobil Uygulama (React Native / Expo + NativeWind)
Kullanıcıların telefonlarından gireceği yerel uygulamadır. Web'deki aynı Backend servisini (`http://localhost:8000`) kullanır.
- Gerekli klasör: `/mobile`
- **Nasıl Çalıştırılır:** 
  1. Öncelikle telefonunuza (iOS veya Android) App Store / Play Store üzerinden **"Expo Go"** uygulamasını indirin.
  2. Bilgisayarda terminal üzerinden `cd mobile` yazarak mobil klasörüne girin.
  3. `npx expo start` veya `npm start` yazın.
  4. Terminal ekrana dev boyutlu bir **QR Kod** basacaktır.
  5. iPhone kullanıcısıysanız direk kamerasını açarak, Android iseniz Expo Go uygulamasının içinden "Scan QR Code" diyerek o kodu okutun.
  6. İşte bu kadar! Uygulama saniyeler içinde doğrudan canlı canlı kendi kişisel telefonunuzda açılacaktır. Kodlarda yaptığınız en küçük değişiklik anlık yansıyacaktır.
