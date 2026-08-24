# Poliçeler — sunucu durumu ve kalan eksikler

**Durum:** Poliçe Oluşturma sihirbazı (5 adım) ve Poliçeler LİSTESİ ekranı
yazıldı. Sunucu tarafı **kısmen açıldı**: `PoliciesController` ve
`InsuranceCompaniesController` artık VAR. Belgenin eski hâlindeki "`Policy`
entity'si var ama controller'ı yok, sigorta şirketi için tablo bile yok" tespiti
GEÇERSİZ.

Doğrulama tabanı: cadapi @ `539383d` — `PoliciesController`, `PolicyManager`,
`PolicyDtos.cs`, `InsuranceCompaniesController`.

> **Bu belge yalnızca durumu kaydeder.** Açılan uçlara bağlanma işi henüz
> YAPILMADI: `policyAgencies`, `policyCreate` ve `policyList` bayrakları
> `src/api/unimplementedEndpoints.ts` içinde DURUYOR ve poliçe kodu bilerek
> değiştirilmedi (backend ekibinden cevap bekleniyor).

## Bağlanmış uçlar (gerçek)

| Uç | Frontend |
|---|---|
| `GET /api/policies?ProjectId=` | `listProjectPolicies` — proje detayının poliçe sekmesi |
| `GET /api/policies/{id}` | `getPolicy` |
| `PUT /api/policies/{id}` | `updatePolicy` — ekranı henüz yok, sözleşme bağlı |
| `DELETE /api/policies/{id}` | `deletePolicy` |
| `GET /api/insurance-companies` | `listInsuranceCompanies` — adım 2 "Sigorta Şirketi" |

Yol **tireli**: `/api/insurance-companies`. Bir süre `/api/insurancecompanies`
varsayılıyordu ve o adres 404 dönüyordu.

## Sunucudaki sözleşme

`PolicyAddDto` (POST `/api/policies`):

```
ProjectUnitId (zorunlu), InsuranceCompanyId?, PolicyNumber?,
Amount?, StartDate?, EndDate?
```

`PolicyDto` (liste ve tekil detay AYNI gövde):

```
Id, ProjectId, ProjectUnitId?, UnitNumber?,
InsuranceCompanyId?, InsuranceCompanyTitle?,
PolicyNumber?, Amount?, StartDate?, EndDate?,
IsActive, IsUnitDeleted
```

`PolicyListQueryDto`: `ProjectId`, `ExcludeUnitDeleted`, `Search`, `Page`,
`PageSize` (varsayılan 30, üst sınır 100).

## Frontend taslağıyla sunucu arasındaki FARKLAR

Bunlar `policyCreate` bağlanmadan önce karara bağlanmalı:

| Konu | Frontend taslağı | Sunucudaki gerçek |
|---|---|---|
| Yol | `POST /api/projects/{id}/policies` | **`POST /api/policies`** |
| Bağlam | `projectId` gövdede | **`ProjectUnitId`**; proje birimden türetiliyor |
| `method` | Gövdede (`'manual'`) | Alan YOK — kabul edilmiyor |
| `agencyId` | Gövdede, sihirbazda ZORUNLU alan | Alan YOK — kabul edilmiyor |
| Benzersizlik | `policyNumber` benzersiz → **409** | `policyNumber` üzerinde hiçbir kontrol YOK. Kural: **bir birimde aynı anda tek aktif poliçe** → **400** |
| Zorunluluk | Sihirbaz hepsini zorunlu tutuyor | Sunucuda `ProjectUnitId` dışında hepsi opsiyonel |

Yetki: `POST`/`PUT`/`DELETE` yalnız `Admin` + `ProjectFirmUser`.
Mevcut poliçeyi yenilemek için önce `DELETE` (elle iptal) gerekiyor —
otomatik kapatma yok.

## Kalan eksikler

| # | Eksik | Etkisi |
|---|---|---|
| 1 | **Acente kavramı sunucuda HİÇ YOK** — entity, tablo, controller, migration yok (tüm repoda `agency`/`acente` için sıfır eşleşme) | Sihirbazın "Acente / Poliçe Firması" adımı karşılıksız. Alan bugün ZORUNLU ve mock listeden besleniyor. `policyAgencies` bayrağı duruyor. |
| 2 | `GET /api/policies` **`ProjectId` ZORUNLU** — `GetListByProjectAsync` önce projeyi görünürlükten geçiriyor, yoksa 404 | Poliçeler LİSTESİ ekranı (bütün projelerin poliçeleri) bu uçla beslenemiyor; mock depoda kalmaya devam ediyor. `policyList` bayrağı duruyor. |
| 3 | Liste ucunda **`InsuranceCompanyId` süzgeci ve `SortBy`/`SortDir` yok** | Ekrandaki şirket filtresi ve sıralama sunucuya taşınamıyor. |
| 4 | `Search` **proje adında aramıyor** — yalnız poliçe no, birim no, abone no | Liste ekranı proje adında da arıyor; uç bağlanınca kapsam daralır. |
| 5 | Satır **proje künyesini taşımıyor** (`ProjectName`/bina kodu yok) | Bütün projelerin listesi açılırsa istemci her satır için ayrı proje isteği atmak zorunda kalır. |
| 6 | **Ödeme durumu alanı yok** — `Policy` entity'sinde karşılığı yok | Proje detayındaki "Ödeme: Bekliyor" rozeti bir İSTEMCİ VARSAYIMIDIR; sunucudan gelen bir değer değil. Uç geldiğinde bu sabit KALDIRILMALI. |

"Birim" sütunu artık eksik DEĞİL: `PolicyDto.UnitNumber` sunucudan geliyor.

## Karara bağlanması gereken konular

**1. Acente alanı ne olacak?** Sunucu kabul etmediği için bugün kullanıcının
doldurduğu değer kayıtta kaybolurdu. Seçenekler: alanı sihirbazdan geçici
kaldırmak, ya da kaydedilemediğini kullanıcıya açıkça söylemek. Karar
verilmeden `policyCreate` bağlanmamalı.

**2. Adım 5'in bilgilendirme metni.** Gereksinim "sürecin sonraki aşamasını
açıklayan metin" diyor ama metni vermiyor. Ekrandaki cümle (`PolicyStepper.tsx`
→ `DONE_MESSAGE`) Esra'dan alındı, analist onayı bekleniyor — kaynağında TODO
ile işaretli.

**3. Poliçe proje bazlı mı birim bazlı mı?** Sunucu kararını vermiş: `Policy`
`ProjectUnit`'e bağlı ve birimde tek aktif poliçe kuralı var. Sihirbaz da birim
soruyor. Gereksinim belgesiyle bu hizanın analist tarafından teyidi bekleniyor.

**4. Teminat tutarının sınırları.** Alt/üst sınır verilmedi; bugün yalnız hane
sayısı sınırlı (15 hane) ve sıfırdan büyük olması isteniyor. Sunucu tarafı da
denetlemeli.

**5. Kayıt Adım 4'e alındı — analist onayı bekleniyor.** Gereksinim belgesi hem
"son adımda İleri düğmesi Bitir olur" hem "beşinci adımda … Bitir'e tıklanınca
poliçe kaydedilir" diyor, yani başarı ekranını kayıttan ÖNCE gösteriyor. Ekran
Adım 4'te kaydediyor, Adım 5 kayıt sonrası sonuç ekranı (K64) — sapma bilinçli,
sebebi kaydın başarısız olabilmesi. Esra onayladı; analist teyidi bekleniyor.

**6. Poliçe LİSTESİ ekranının yetkisi.** Liste bütün projelerin poliçelerini
gösteriyor. Proje firması kullanıcısının yalnız kendi projelerinin poliçelerini
görmesi gerekiyorsa süzme SUNUCUDA olmalı (istemci tarafı yalnız görünürlük).
