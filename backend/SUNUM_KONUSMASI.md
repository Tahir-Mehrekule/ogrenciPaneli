# 🎤 UniTrack AI — Hocaya Sunum Konuşma Metni (~10 dakika)

---

## GİRİŞ (1 dakika)

Hocam merhaba, bugün sizlere geliştirdiğimiz **UniTrack AI** projesinin backend tarafını anlatacağım. UniTrack AI, üniversite öğrencilerinin projelerini takip edebileceği, görev yönetimi yapabileceği ve yapay zeka destekli öneriler alabileceği bir platformdur.

Backend'i **Python FastAPI** framework'ü ile geliştirdik. Veritabanı olarak **PostgreSQL**, ORM olarak **SQLAlchemy** kullanıyoruz. Kimlik doğrulama için **JWT (JSON Web Token)** ve şifreleme için **bcrypt** tercih ettik.

Projemizi **katmanlı mimari** ile tasarladık. Controller, Service, Manager, Repository ve Model olmak üzere beş katmandan oluşuyor. Her katmanın tek bir sorumluluğu var. Şimdi bu yapıyı dosya dosya anlatacağım.

---

## BÖLÜM 1 — Proje Altyapısı (1.5 dakika)

Önce projenin altyapı dosyalarından başlayalım.

### Docker ve Deployment

Projemizi **Docker** ile containerize ettik. `docker-compose.yml` dosyasında iki servisimiz var: PostgreSQL veritabanı ve FastAPI uygulaması. Docker Compose sayesinde tek komutla tüm ortamı ayağa kaldırabiliyoruz. Veritabanının sağlıklı olmasını bekleyip sonra API'yi başlatıyor — yani sıralı başlatma yapıyor.

`Dockerfile`'da Python 3.11 slim imajını kullanıyoruz. Sistem bağımlılıklarını kurup, requirements.txt'ten paketleri yükleyip, uvicorn ile uygulamayı 8000 portunda çalıştırıyoruz.

### Bağımlılıklar

`requirements.txt` dosyamızda tüm Python bağımlılıklarımız var: FastAPI web framework'ü, SQLAlchemy ORM, Pydantic validasyon kütüphanesi, JWT için python-jose, şifreleme için passlib, AI API çağrıları için httpx ve test için pytest.

### Konfigürasyon

`core/config.py` dosyasında Pydantic Settings kullanarak `.env` dosyasından tüm ortam değişkenlerini okuyoruz. Veritabanı bağlantı adresi, JWT gizli anahtarı, token süreleri, OpenRouter AI API bilgileri ve CORS ayarları burada tanımlı. Tek bir `settings` objesi oluşturup uygulama genelinde kullanıyoruz.

---

## BÖLÜM 2 — Veritabanı Katmanı (1.5 dakika)

### database.py

`core/database.py` dosyasında SQLAlchemy bağlantısını kuruyoruz. Engine, SessionLocal ve Base olmak üzere üç temel bileşen var.

**Engine** PostgreSQL'e bağlantı motorumuzdur — bağlantı havuzu yönetimi yapar, pool_pre_ping ile kopan bağlantıları tespit eder. **SessionLocal** her API isteğinde yeni bir veritabanı oturumu üretir. **Base** ise tüm modellerimizin türediği declarative base sınıfıdır.

`get_db()` fonksiyonu FastAPI dependency olarak çalışır — her istek geldiğinde oturum açar, istek bittiğinde hata olsa bile oturumu kapatır. Bu sayede bağlantı sızıntısı olmaz.

### base_model.py

`common/base_model.py` dosyamız tüm veritabanı modellerinin türeyeceği abstract base sınıfı tanımlar. Burada dört ortak alan var:

- **id**: UUID tipinde otomatik üretilen primary key
- **created_at**: Kaydın oluşturulma tarihi, otomatik set edilir
- **updated_at**: Her güncellmede otomatik değişen tarih
- **is_active**: Soft delete mekanizması — kaydı silmek yerine False yapıyoruz

`__abstract__ = True` olduğu için bu sınıf kendi başına tablo oluşturmaz. DRY prensibine uyarak bu alanları her modelde tekrar yazmak yerine bir kere burada tanımlıyoruz.

---

## BÖLÜM 3 — Ortak Bileşenler / Common (2 dakika)

### base_dto.py — Veri Transfer Objeleri

DTO yani Data Transfer Object'ler API ile dış dünya arasındaki veri alışverişini kontrol eder. `BaseResponse` sınıfı tüm response'ların ortak alanlarını tanımlar. `PaginatedResponse` generic yapıda sayfalanmış liste response'udur — herhangi bir tip ile kullanılabilir: `PaginatedResponse[UserResponse]`, `PaginatedResponse[ProjectResponse]` gibi. `FilterParams` sınıfı ise sayfalama, sıralama ve arama parametrelerini tanımlar.

Pydantic'in `Field` fonksiyonu ile alanlara minimum/maksimum değer, varsayılan değer ve açıklama kuralları koyuyoruz. Bu kuralları ihlal eden istekler otomatik olarak 422 hatası ile reddediliyor.

### base_repo.py — Generic Repository

`BaseRepository` sınıfı Generic yapıda tasarlandı. Create, Read, Update, Delete yani CRUD işlemlerini tek bir yerde tanımlayıp tüm feature'ların bundan türemesini sağlıyoruz. Soft delete ve hard delete olmak üzere iki silme yöntemimiz var. Soft delete kaydı pasif yapar, hard delete tamamen siler.

### base_service.py — Service Katmanı

Service katmanı controller ile repository arasındaki iş mantığını yönetir. Sayfalama hesaplaması, None alan filtreleme gibi ortak işlemleri burada yapıyoruz. Alt sınıflar ihtiyaca göre bu metodları override edebilir.

### Hata Yönetimi

`exceptions.py`'da beş farklı hata sınıfı tanımladık: 404 NotFoundException, 400 BadRequestException, 401 UnauthorizedException, 403 ForbiddenException ve 409 ConflictException. `exception_handlers.py` bu hataları yakalar ve standart JSON formatında response döner. Debug modda hata detayını gösterir, production'da göstermez.

### Yardımcı Modüller

`enums.py`'da kullanıcı rolleri, proje durumları, görev ve rapor durumlarını enum olarak tanımladık. `validators.py`'da okul mail kontrolü, email'den otomatik rol belirleme ve YouTube URL doğrulama fonksiyonları var. `pagination.py`'da gelişmiş sıralama, sayfalama ve çoklu alan araması yapan helper fonksiyonlar bulunuyor.

---

## BÖLÜM 4 — Güvenlik / Security (1.5 dakika)

### security.py

Güvenlik modülümüzde iki ana işlem var: **şifre yönetimi** ve **JWT token yönetimi**.

Şifreleri **bcrypt** ile hashliyoruz. Düz şifre asla veritabanına kaydedilmez. Aynı şifre her seferinde farklı hash üretir çünkü her hashlemede rastgele bir salt eklenir.

JWT tarafında iki tip token üretiyoruz: **Access token** 15 dakika geçerlidir ve her API isteğinde kullanılır. **Refresh token** 7 gün geçerlidir ve access token süresi dolduğunda yeni token almak için kullanılır. Bu mekanizmaya **sliding expiration** diyoruz — kullanıcı aktif olduğu sürece oturum süresi uzar.

### dependencies.py

`get_current_user` fonksiyonu korumalı endpoint'lerde kullanılır. Gelen JWT token'ı beş aşamada doğrular: token geçerli mi, tipi access mi, içinde user_id var mı, kullanıcı veritabanında var mı, hesap aktif mi. Herhangi bir kontrol başarısızsa 401 hatası döner.

`role_required` fonksiyonu ise rol bazlı yetkilendirme sağlar. Örneğin bir endpoint'e sadece admin erişebilir veya hem öğretmen hem admin erişebilir diye belirleyebiliyoruz.

---

## BÖLÜM 5 — Auth Feature (2 dakika)

Auth modülü projemizin **ilk tam feature'udur** ve katmanlı mimarimizi uygulamaya koyduğumuz yerdir.

### auth_model.py — User Modeli

`User` sınıfı `BaseModel`'den türer, yani id, created_at, updated_at ve is_active otomatik gelir. Üzerine email, password_hash, name, role ve department alanlarını ekledik. Email alanı unique ve index'lidir — hızlı arama ve tekrar engelleme sağlar. Role alanı PostgreSQL ENUM tipindedir.

### auth_dto.py — Request/Response Şemaları

Dört request/response şemamız var: `RegisterRequest` kayıt bilgilerini, `LoginRequest` giriş bilgilerini alır. `TokenResponse` access ve refresh token çiftini döner. `UserResponse` ise kullanıcı bilgilerini döner ama **şifre hash'ini dahil etmez** — bu güvenlik açısından kritiktir.

### auth_repo.py — Veri Erişim

`AuthRepo` sınıfı `BaseRepository[User]`'dan türer, CRUD işlemleri hazır gelir. Ek olarak email ile kullanıcı bulma, rol bazlı listeleme ve email'in var olup olmadığını kontrol eden sorgular yazdık.

### auth_manager.py — Validasyon Mantığı

Kayıt validasyonu, giriş doğrulama ve refresh token kontrolü burada yapılır. Kayıt öncesinde okul maili kontrolü, duplicate email kontrolü ve otomatik rol belirleme işlemleri gerçekleşir. Giriş doğrulamada kasıtlı olarak belirsiz hata mesajı kullanıyoruz — "Email veya şifre hatalı" diyerek saldırganın hangisinin yanlış olduğunu anlamasını engelliyoruz.

### auth_service.py — İş Mantığı Orkestrasyon

Service katmanı tüm akışı yönetir. Kayıt işleminde validasyon, şifre hashleme, veritabanına kayıt ve token üretimi sırayla yapılır. Giriş işleminde doğrulama ve token üretimi gerçekleşir. Token yenileme işleminde ise refresh token doğrulanır, kullanıcının hâlâ aktif olduğu kontrol edilir ve yeni token çifti oluşturulur.

### auth_controller.py — API Endpoint'leri

Tüm endpoint'ler `/api/v1/auth` altında gruplanır. Dört endpoint'imiz var:

- **POST /register**: Yeni kullanıcı kaydı — 201 Created döner
- **POST /login**: Kullanıcı girişi — token çifti döner
- **POST /refresh**: Token yenileme — yeni token çifti döner
- **GET /me**: Profil bilgisi — giriş yapmış kullanıcının bilgilerini döner

Controller'da hiçbir iş mantığı yoktur — sadece isteği alır, service'e yönlendirir ve response döner.

---

## KAPANIŞ (0.5 dakika)

Özetlemek gerekirse, projemizde **katmanlı mimari** uyguladık. Controller isteği alır, Service iş mantığını yönetir, Manager validasyonları yapar, Repository veritabanı işlemlerini gerçekleştirir ve Model tablo yapısını tanımlar. Her katman tek bir sorumluluğa sahiptir ve alt katmanlar üst katmandan bağımsızdır.

Common klasöründeki base sınıflar sayesinde kod tekrarını önledik, DRY prensibine uyduk. Auth feature'ı bu mimariyi uygulayan ilk modülümüzdür. İleride Project, Task, Report ve AI modülleri de aynı yapıda eklenecektir.

Teşekkür ederim hocam, sorularınız varsa cevaplamaya hazırım.

---

> ⏱️ **Süre dağılımı**: Giriş ~1dk | Altyapı ~1.5dk | Veritabanı ~1.5dk | Common ~2dk | Güvenlik ~1.5dk | Auth ~2dk | Kapanış ~0.5dk = **~10 dakika**
