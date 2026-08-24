# Proje firması kullanıcıları — sunucu durumu ve kalan eksikler

**Durum:** Ekranlar yazıldı ve **sunucu tarafı AÇILDI**. Kullanıcı modülü gerçek
uçlara bağlı (`src/api/projectFirmUsers.ts`, `src/api/projectFirmUserForm.ts`,
`src/api/users.ts`); bellekteki mock depo (`projectFirmUsersMock.ts`) SİLİNDİ —
bu adla yeni kod yazma.

Doğrulama tabanı: cadapi @ `539383d` — `UsersController`, `UserDtos.cs`,
`AuthController`.

Gereksinim: `docs/requirements/proje-firmasi-kullanicilari.md`
Kararlar: `docs/kararlar.md` K45–K47

## Backend cevapladı (2026-08-11) — hâlâ geçerli

| Konu | Sonuç |
|---|---|
| Uç yolu | `/api/users` (tablo tek: `Users`); proje firması ekranı `RoleCode=ProjectFirmUser` ile süzer. Oluşturma `POST /api/auth/register`'da kaldı. **Üçü de açıldı.** |
| `authorityType` | Rol DEĞİL (teyit edildi). `Code`/`CodeGroup` altyapısında `YetkiTipi` grubu, `codeValue` = `FirmEngineer` / `FirmAuthorizedPerson`. Ekranda `name`, mantıkta `codeValue`. **Grup HENÜZ AÇILMADI** — aşağıya bakın. |
| Benzersizlik (KK-16) | Müsaitlik ucu AÇILMAYACAK. `register` çakışmada 409 + `{ message }` döndürüyor; form 409'u alana basıyor. Soft-delete edilmiş kayıtların adı/e-postası da rezerve. |
| Sayfalama zarfı | Kabul: `{ items, totalCount, page, pageSize }`. |
| Kullanıcı "Aktif" | `SoftDeleteEntity.IsActive` global query filter'a bağlı, pasif kayıt sorgudan hiç dönmez. **KAPANDI:** süzgeç ekrandan kaldırıldı (K130), `IsEnabled` kolonu İSTENMİYOR. |

## Çalışan uçlar

| Uç | Frontend | Yetki |
|---|---|---|
| `GET /api/users` | Kullanıcı listesi (sayfalı) | Giriş yapmış herkes; kapsam `WhereVisibleTo` ile daralıyor |
| `GET /api/users/{id}` | Güncelleme ekranının kaydı | aynı |
| `PUT /api/users/{id}` | Güncelleme | Admin herkesi, diğerleri yalnız kendini; rol/firma yalnız Admin |
| `POST /api/auth/register` | Oluşturma | yalnız Admin |
| `POST /api/users/{id}/reset-password` | Şifre sıfırlama | yalnız Admin |

`UserListQueryDto`: `RoleCode`, `ProjectFirmId`, `GasDistributionFirmId`,
`GasDistributionGroupId`, `SortBy` (`createdAt` | `fullName`), `SortDir`,
`Page`, `PageSize`.

`UserListItemDto`:

```
Id, FullName, Email, Username, Phone, RoleCode, RoleName,
ProjectFirmId?, ProjectFirmName?,
GasDistributionFirmId?, GasDistributionFirmName?, CreatedAt
```

`UserUpdateDto`: `FullName`, `Email`, `Phone`, `RoleCode?`, `ProjectFirmId?`,
`GasDistributionFirmId?`.

Firma seçim kutuları da gerçek uçlardan besleniyor:
`GET /api/gasdistributionfirms` ve `GET /api/projectfirms`. KK-20 daraltması
(bir G.D. firmasının yetkili proje firmaları) da açıldı:
`GET /api/project-firm-authorizations?GasDistributionFirmId=` (K87).

## AÇIK ve BLOKE EDEN: kullanıcının ÇOKLU yetkisi

Sunucudaki kullanıcı **tek** bir (gaz dağıtım firması, proje firması) ikilisi
taşıyor: `UserListItemDto` ve `UserUpdateDto` alanları tekil
(`ProjectFirmId`, `GasDistributionFirmId`). Gereksinim ise bir kullanıcının
birden çok yetkisi olmasını istiyor (KK-11, KK-22).

Bu karara bağlanmadan sayfalamanın SATIR bazlı mı KULLANICI bazlı mı olacağı da
belirlenemiyor: satır = yetki kaydı olursa bir kullanıcı listede üç kez görünür
ve `totalCount` satır sayısı olur.

Ayrıntı: `.claude/knowledge/project-firm-user-authorization.md`

## Kalan eksikler

| # | Eksik | Etkisi |
|---|---|---|
| 1 | **Çoklu yetki (`UserAuthorization`) yok** — kullanıcı tek firma ikilisi taşıyor | KK-11 / KK-22 karşılanamıyor. Yukarıdaki bloke eden madde. |
| 2 | **`YetkiTipi` kod grubu açılmadı** — `CodeGroupNames` içinde yok, `authorityType` alanı hiçbir DTO'da yok | Yetki türü (Firma Mühendisi / Firma Yetkilisi) ekranda gösterilemiyor (KK-3, KK-8). |
| 3 | **`gdfRegistrationNumber` alanı yok** | Listede boşsa "—" gösteriliyor (KK-9, madde 16). |
| 4 | `GET /api/users` **arama (`q`/`Search`) parametresi almıyor** | Kullanıcı adı / ad soyad / e-posta araması (KK-5) sunucuya taşınamıyor. Sayfalı listede istemci tarafı arama yalnız görünen sayfayı süzeceği için yanlış sonuç verirdi. |
| 5 | **Yetki satırı başına `isActive` yok** | KK-4'ün yetki satırı bacağı karşılanamıyor. Kullanıcı bacağı K130 ile kapandı. |

## Not

`src/api/unimplementedEndpoints.ts` artık kullanıcı modülüne dair bir satır
TAŞIMIYOR — buradaki eksikler uç YOKLUĞU değil, açılmış uçların taşımadığı
ALANLAR. Bu yüzden bayrakla değil, bu belgeyle takip ediliyorlar.
