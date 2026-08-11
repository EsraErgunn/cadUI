# Proje firması kullanıcıları — eksik uçlar ve sözleşme taslağı

**Durum:** Ekranlar yazıldı, sunucu tarafı YOK. Bu belge backend'den istenecekleri
tek yerde toplar.

## Backend cevapladı (2026-08-11) — güncel durum

| Konu | Sonuç |
|---|---|
| Uç yolu | `/api/users` (tablo tek: `Users`); proje firması ekranı `?projectFirmId=` ile süzer. Oluşturma `POST /api/auth/register`'da kalıyor. Açılacaklar: `GET /api/users`, `GET/PUT/DELETE /api/users/{id}`. |
| `authorityType` | Rol DEĞİL (teyit edildi). `Code`/`CodeGroup` altyapısında `YetkiTipi` grubu, `codeValue` = `FirmEngineer` / `FirmAuthorizedPerson`. Ekranda `name`, mantıkta `codeValue`. |
| Benzersizlik (KK-16) | Müsaitlik ucu AÇILMAYACAK. `register` çakışmada 409 + `{ message }` döndürüyor; form 409'u alana basacak. Soft-delete edilmiş kayıtların adı/e-postası da rezerve. |
| Sayfalama zarfı | Kabul: `{ items, totalCount, page, pageSize }`. Repodaki İLK sayfalı uç; mevcut uçlar düz dizi dönmeye devam edecek (tip tarafında ayrı ele alınacak). |
| Kullanıcı "Aktif" | `SoftDeleteEntity.IsActive` global query filter'a bağlı, pasif kayıt sorgudan hiç dönmez → KK-4 için ayrı `IsEnabled` kolonu gerekiyor. |

**AÇIK ve BLOKE EDEN:** kullanıcının çoklu yetkisi (`UserAuthorization`) ve buna
bağlı olarak sayfalamanın satır bazlı mı kullanıcı bazlı mı olacağı.
Ayrıntı: `.claude/knowledge/project-firm-user-authorization.md`

**Sözleşme taslağı bu belgede FRONTEND tarafından önerilmiştir**; alan adları ve
yollar backend'le doğrulanacak. Uç açıldığında frontend'de değişecek tek yer
`src/api/projectFirmUsers.ts` + `src/api/projectFirmUserForm.ts` gövdeleridir;
tipler, ekranlar ve testler aynı kalır.

Gereksinim: `docs/requirements/proje-firmasi-kullanicilari.md`
Kararlar: `docs/kararlar.md` K45–K47

## Bugün sunucuda ne var

Yerel cadapi OpenAPI'sinde (`/openapi/v1.json`, 2026-08-11) kullanıcıya dair
**tek** uç var:

```
POST /api/auth/register   (yalnızca Admin)
RegisterRequest: fullName, email, username, password, phone, roleCode,
                 projectFirmId, gasDistributionFirmId
→ RegisteredUserDto: id, fullName, username, email, roleCode
```

Bu uca **bağlanılmadı**. Gerekçe: gövde yalnız TEK bir
(gaz dağıtım firması, proje firması) ikilisi taşıyor, `Aktif` ve `GDF Kayıt No`
alanları yok, kullanıcıyı geri okuyacak liste/detay ucu da yok. Yarım bağlansaydı
listelenemeyen ve güncellenemeyen kayıtlar üretirdik.

## Eksikler

| # | İhtiyaç | Gereksinim | Sunucuda |
|---|---------|-----------|----------|
| 1 | Kullanıcı listesi (sayfalı, filtreli) | madde 6–7, KK-8, KK-12 | yok |
| 2 | Kullanıcı detayı | KK-25 | yok |
| 3 | Kullanıcı oluşturma (çoklu yetki ile) | madde 17, KK-24 | kısmi (register) |
| 4 | Kullanıcı güncelleme | KK-25 | yok |
| 5 | E-posta / kullanıcı adı müsaitlik denetimi | KK-16 | yok |
| 6 | Proje firması listesini G.D. firmasına göre daraltma | KK-20 | yok (liste gerçek, daraltma yok) |

**Firma listeleri BAĞLANDI.** Yetki satırındaki iki seçim kutusu gerçek uçlardan
besleniyor: `GET /api/gasdistributionfirms` ve `GET /api/projectfirms`. Mock
kullanıcı satırları da bu listelerden tohumlanıyor, yani ekranda görünen her
firma gerçek. Eksik kalan yalnız 6. maddedeki DARALTMA.

### Satır bazlı alan eksikleri

| Alan | Nerede gerekiyor | Not |
|------|------------------|-----|
| `isActive` (kullanıcı) | KK-4, KK-18 | `User` tablosunda karşılığı doğrulanmalı |
| `isActive` (yetki satırı) | KK-4, madde 16 | yetki satırı başına ayrı bayrak |
| `gdfRegistrationNumber` | KK-9, madde 16 | listede boşsa "—" gösteriliyor |
| yetki türü (Firma Mühendisi / Firma Yetkilisi) | KK-3, KK-8 | **rol değil**, yetki satırının alanı (K45) |
| kullanıcı ↔ (G.D. firması, proje firması) N:N | KK-11, KK-22 | `ProjectFirmAuthorization` benzeri bir tablo gerekiyor |

## Açık soru (backend'e)

**`POST /api/auth/register` genişletilecek mi, yoksa ayrı bir admin ucu mu
açılacak?**

- Genişletme: `register` gövdesine `isActive` ve `competencies[]` eklenir; kayıt
  ve yönetim aynı uçtan yürür.
- Ayrı uç: `register` self-servis kayıt olarak kalır, yönetici işlemleri
  `/api/projectfirmusers` altında toplanır (aşağıdaki taslak bunu varsayar).

Karar verilene kadar frontend yolları `unimplementedEndpoints.ts`'te tutuyor.

## Önerilen sözleşme (taslak)

Yollar `projectfirmusers` diye öneriliyor: sistemde gaz dağıtım firması
kullanıcıları da var, `users` hangi kullanıcı olduğunu söylemiyor (madde 1).

### 1. Liste

```
GET /api/projectfirmusers?page=1&pageSize=30&q=&authorityType=&onlyActive=
→ 200 { items: ProjectFirmUserRowDto[], totalCount, page, pageSize }
```

- **Satır = yetki kaydı, kullanıcı değil** (KK-11): bir kullanıcının üç yetkisi
  varsa üç satır döner, kullanıcı bilgileri yinelenir. `totalCount` SATIR sayısı.
- Aynı kullanıcının satırları art arda gelmeli (KK-11).
- `q`: kullanıcı adı, ad soyad ve e-posta üzerinde içerik bazlı, büyük/küçük harf
  ve Türkçe karakter duyarsız (KK-5).
- `onlyActive=true`: kullanıcı aktif **ve** yetki satırı aktif (KK-4).
- Sıralanabilir sütun İSTENMİYOR; sıra sunucuda sabit.

```jsonc
// ProjectFirmUserRowDto
{
  "competencyId": 5001,        // satır kimliği (React key + sayfalama)
  "userId": 1001,
  "username": "tolga.ertek",
  "fullName": "Tolga Ertek",
  "email": "tolga.ertek@firma.com",
  "phone": "05321180880",      // ham; biçimi arayüz kuruyor (KK-9)
  "authorityType": "firmEngineer",   // | "firmAuthorizedPerson"
  "gasFirm": { "id": 103, "name": "AKSA-GEMLİK" },
  "projectFirm": { "id": 201, "name": "AA Mühendislik" },
  "gdfRegistrationNumber": "512"     // null olabilir
}
```

### 2. Detay

```
GET /api/projectfirmusers/{id}
→ 200 { id, fullName, username, email, phone, isActive, competencies: [...] }
```

`competencies[]`: `{ id, gasFirm, projectFirm, authorityType, gdfRegistrationNumber, isActive }`.
Şifre DÖNMEZ.

### 3. Oluşturma / güncelleme

```
POST /api/projectfirmusers        → 200 { id }
PUT  /api/projectfirmusers/{id}   → 200 { id }

{
  "fullName": "...", "username": "...", "email": "...",
  "phone": "05321180880" | null,
  "password": "..." | null,          // PUT'ta null = şifre DEĞİŞMEZ (KK-25)
  "isActive": true,
  "competencies": [
    { "gasDistributionFirmId": 103, "projectFirmId": 201,
      "authorityType": "firmEngineer", "gdfRegistrationNumber": "512" | null,
      "isActive": true }
  ]
}
```

- Kullanıcının rolü sunucuda `ProjectFirmUser` olarak sabitlenir; `authorityType`
  rol DEĞİL, yetki satırının alanıdır (K45).
- En az bir yetki satırı zorunlu (KK-23) — sunucu da denetlemeli.
- Aynı (G.D. firması, proje firması) ikilisi iki kez gelemez (KK-22) → 400.
- Şifre kuralı (KK-17): en az 8 karakter, büyük/küçük harf, rakam, özel karakter.
  Geri döndürülemez biçimde saklanır.

### 4. Müsaitlik denetimi

```
GET /api/projectfirmusers/availability?email=&username=&excludeUserId=
→ 200 { isEmailTaken: bool, isUsernameTaken: bool }
```

Gereksinim denetimin sunucuda çalışmasını istiyor (KK-16). Bu uç yalnız
KAYDETMEDEN ÖNCE uyarmak için; asıl denetim yine POST/PUT'ta yapılmalı (yarış
durumu). İstemcide tam listeyi indirip aramak seçenek değil — kayıt adedi yüksek.

### 5. Yetkili proje firmaları

```
GET /api/gasdistributionfirms/{id}/projectfirms
→ 200 [{ id, name }]
```

Seçilen gaz dağıtım firmasında yeterliliği olan proje firmaları (KK-20).
`ProjectFirmAuthorization` tablosu var ama onu okuyan/yazan uç yok — proje
firması ekleme ekranı (ayrı dalda) da aynı boşlukta.

## Bu uçlar gelene kadar

- `src/api/unimplementedEndpoints.ts` uygulanmamış uçları tek yerde tutuyor.
  Uç açılınca oradaki satır silinir; `isEndpointImplemented` çağrısı derleme
  hatası verir ve değiştirilecek gövdeye götürür.
- Mock gövde (`projectFirmUsersMock.ts`) sunucunun yapacağı işi yapıyor: süzme,
  sıralama ve dilimleme orada, dışarıya `{ items, totalCount }` çıkıyor.
- Kaydetme mock'ta kalıyor ve kullanıcıya "sunucuya yazılmıyor" uyarısı
  gösteriliyor (`isPersisted: false`).
