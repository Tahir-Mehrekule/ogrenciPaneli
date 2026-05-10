# UniTrack AI — Proje Amacı ve Kapsamı

## Proje Nedir?

**UniTrack AI**, üniversite düzeyindeki öğrenci ve öğretmenlerin proje yönetim süreçlerini yapay zeka desteğiyle yürütebileceği, modern ve modüler bir **Proje Yönetim Sistemi**'dir.

## Problemin Tanımı

Üniversitelerde bitirme projeleri, dönem ödevleri ve danışmanlık süreçleri genellikle e-posta, WhatsApp veya kağıt üzerinde dağınık şekilde yürütülür. Bu da:
- Proje takibinin zorlaşmasına
- Haftalık raporlamanın aksamasına
- Öğretmen-öğrenci iletişiminde kopukluklara
- Görev dağılımının plansız kalmasına

yol açar.

## Çözüm

UniTrack AI, tüm bu süreçleri tek bir platformda toplar:

| İhtiyaç | UniTrack AI Çözümü |
|---------|-------------------|
| Proje başvuru ve onay süreci | Taslak → Beklemede → Onaylı/Reddedildi → Devam Ediyor → Tamamlandı yaşam döngüsü |
| Görev yönetimi | Kanban board (Yapılacak / Devam Ediyor / Tamamlandı) |
| Haftalık raporlama | Öğrenci haftalık rapor yazar, öğretmen inceler ve geri bildirim verir |
| Yapay zeka desteği | Proje açıklamasına göre otomatik görev önerisi, rapor analizi |
| Dosya paylaşımı | Raporlara dosya ekleme (PDF, Word vb.), MinIO ile güvenli depolama |
| Ders yönetimi | Öğretmenler ders açar, öğrenciler kaydolur |
| Ekip yönetimi | Davet kodu ile projeye üye ekleme, rol atama (Yönetici/Üye) |
| Bildirimler | Proje onayı, görev ataması, rapor incelemesi gibi olaylarda anlık bildirim |

## Kullanıcı Rolleri

### Öğrenci
- Derslere kaydolur
- Proje oluşturur, taslaktan onay sürecine gönderir
- Projesine ekip arkadaşı ekler
- Kanban board üzerinde görevleri yönetir
- Haftalık rapor yazar, dosya ve YouTube videosu ekler
- AI görev önerilerini görür ve kullanır

### Öğretmen
- Ders açar, öğrenci kayıtlarını yönetir
- Bekleyen projeleri onaylar veya reddeder
- Öğrencilerin haftalık raporlarını inceler, geri bildirim verir
- Danışmanı olduğu projeleri takip eder
- Proje kategorileri oluşturur

### Admin
- Sistem genel istatistiklerini görür
- Kullanıcı yönetimi (onay bekleyen öğrencileri onaylama)
- Bölüm ve öğrenci numarası ön eklerini yönetir
- Tüm aktivite kayıtlarını denetler

## Mimari Yapı

```
┌──────────────────────────────────────────────────────┐
│                   UniTrack AI                        │
├──────────────┬──────────────────┬────────────────────┤
│   Web Panel  │  Mobil Uygulama  │   Backend API      │
│  (Next.js)   │  (React Native)  │   (FastAPI)        │
│  :3000       │  Expo Go ile     │   :19000           │
├──────────────┴──────────────────┴────────────────────┤
│         PostgreSQL  │  MinIO (Dosya)  │  OpenRouter AI │
└──────────────────────────────────────────────────────┘
```

- **Backend**: FastAPI + PostgreSQL + MinIO + OpenRouter AI
- **Frontend**: Next.js 16 (App Router) + TailwindCSS
- **Mobil**: React Native / Expo + NativeWind
- **Altyapı**: Docker Compose (3 servis)

## Teknik Özellikler

- **Kimlik doğrulama**: JWT tabanlı, sliding expiration (15 dk access + 7 gün refresh token)
- **Yetkilendirme**: Role-based access control (STUDENT / TEACHER / ADMIN)
- **Soft delete**: Tüm silme işlemleri geri dönüşümlü (`is_deleted` flag)
- **Aktivite kaydı**: Sistemdeki tüm önemli işlemler loglanır
- **E-posta doğrulama**: Sadece `.edu.tr` uzantılı e-postalar ile kayıt, `@ogr.` içerenler otomatik öğrenci rolü alır
- **Paylaşım kodu**: Projelere 8 karakterlik benzersiz kod ile ekip arkadaşı davet etme
- **Sayfalama**: Tüm liste endpoint'lerinde offset/limit tabanlı sayfalama ve dinamik sıralama

## Hedef Kitle

- Üniversite öğrencileri (lisans/önlisans bitirme projeleri, dönem ödevleri)
- Akademik danışmanlar ve öğretim görevlileri
- Bölüm başkanlıkları ve proje koordinatörleri
