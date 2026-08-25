# Poliçeler — sunucu durumu ve kalan eksikler

**Durum:** Poliçe Oluşturma sihirbazı (5 adım) ve Poliçeler LİSTESİ ekranı
yazıldı. Sunucu tarafı **kısmen açıldı**: `PoliciesController` ve
`InsuranceCompaniesController` artık VAR. Belgenin eski hâlindeki "`Policy`
entity'si var ama controller'ı yok, sigorta şirketi için tablo bile yok" tespiti
GEÇERSİZ.

Doğrulama tabanı: cadapi @ `a6ea695` — `PoliciesController`, `PolicyManager`,
`PolicyDtos.cs`, `InsuranceCompaniesController`.

> **Poliçe modülünün TAMAMI gerçek uçlara bağlandı.** `policyList`,
> `policyAgencies` ve `policyCreate` bayraklarının üçü de kalktı;
> `unimplementedEndpoints.ts` artık poliçeye dair satır taşımıyor.

## Bağlanmış uçlar (gerçek)

| Uç | Frontend |
|---|---|
| `GET /api/policies?ProjectId=` | `listProjectPolicies` — proje detayının poliçe sekmesi |
| `GET /api/policies` (ProjectId'siz) | `listPolicies` — Poliçeler listesi ekranı (tüm projeler) |
| `GET /api/policies/{id}` | `getPolicy` |
| `PUT /api/policies/{id}` | `updatePolicy` — ekranı henüz yok, sözleşme bağlı |
| `DELETE /api/policies/{id}` | `deletePolicy` |
| `POST /api/policies` | `createPolicy` — sihirbazın "Bitir" adımı |
| `GET /api/insurance-companies` | `listInsuranceCompanies` — adım 2 firma kutusu |

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
Id, ProjectId, ProjectName?, ProjectUnitId?, UnitNumber?,
InsuranceCompanyId?, InsuranceCompanyTitle?,
PolicyNumber?, Amount?, StartDate?, EndDate?,
IsActive, IsUnitDeleted
```

`PolicyListQueryDto`: `ProjectId` (**OPSİYONEL** — verilmezse kullanıcının
görünürlük kapsamındaki tüm poliçeler), `InsuranceCompanyId`,
`ExcludeUnitDeleted`, `Search`, `Page`, `PageSize` (varsayılan 30, üst sınır 100).

Satır `ProjectName` taşıyor — liste, proje künyesi için ikinci istek atmıyor.

**Sıralama parametresi YOK.** Uç `SortBy`/`SortDir` almıyor; sıra sunucuda sabit
(`StartDate` azalan, `Id` tiebreaker). Arayüzde sıralanabilir başlık
bırakılmadı.

**Arama kapsamı:** poliçe numarası, birim numarası, abone numarası (contains).
**Proje adı DAHİL DEĞİL.**

## Kayıt gövdesi — sunucuyla HİZALANDI

`CreatePolicyPayload` artık `PolicyAddDto` ile birebir; uçta karşılığı olmayan
alan gövdeye girmiyor:

| Alan | Eski taslak | Bugün |
|---|---|---|
| Yol | `POST /api/projects/{id}/policies` | **`POST /api/policies`** |
| `projectId` | Gövdede | KALDIRILDI — sunucu projeyi birimden türetiyor |
| `projectUnitId` | — | Gövdede, ZORUNLU |
| `method` | Gövdede (`'manual'`) | KALDIRILDI — sunucuda alan yok |
| `agencyId` | Gövdede, zorunlu | KALDIRILDI — acente kavramı yok |

Uyumsuzluk KALMADI. İstemcideki uydurma benzersizlik denetimi kaldırıldı;
"bir birimde tek aktif poliçe" kuralını sunucu söylüyor ve mesajı olduğu gibi
gösteriliyor.

**Yöntem adımı** arayüzde duruyor (gereksinim 15, tek seçenek) ama değeri
gövdeye GİRMİYOR ve API tipinde yeri yok — UI-only bilgi.

### Dolu birim sihirbazda seçilemez

Sunucu ihlali ancak `POST` sırasında söyleyebildiği için sihirbaz projenin
mevcut poliçelerini önden okuyor (`GET /api/policies?ProjectId=`, proje
detayının sekmesiyle ORTAK önbellek anahtarı) ve poliçesi olan birimi
**seçilemez** hâlde listeliyor. Birim gizlenmiyor: kullanıcı onu görüp neden
seçemediğini okuyor. Üç ayrı ipucu var — birim yok / hepsi dolu / bir kısmı
dolu. Bu, 400'ün yerine geçmiyor; yarış hâlinde sunucu yine reddediyor ve
mesajı gösteriliyor.

Yetki: `POST`/`PUT`/`DELETE` yalnız `Admin` + `ProjectFirmUser`.

### Kayıt davranışı (koddan doğrulandı)

- **Başarı:** `200` + oluşturulan `PolicyDto`, SARMALAYICISIZ (`201` değil;
  `BaseApiController.FromResult` → `Ok(result.Data)`).
- **Birimde zaten aktif poliçe varsa:** `400` + `{ message }`. **`409` DEĞİL.**
  Eski poliçe **OTOMATİK KAPATILMAZ** — kullanıcı önce `DELETE /api/policies/{id}`
  ile iptal etmeli. "Aktif" = global `IsActive` süzgeci (`Policy : SoftDeleteEntity`).
- **Doğrulama** (`PolicyAddValidator`, FluentValidation): `ProjectUnitId > 0`,
  `PolicyNumber` ≤ 50 karakter, `Amount >= 0`, `EndDate >= StartDate`.
- **Bulunamayanlar:** birim / sigorta şirketi / görünür proje yoksa `404`.

### Hata gövdesi İKİ biçimde geliyor

| Kaynak | Gövde |
|---|---|
| İş kuralı (`ErrorDataResult`) | `{ "message": "..." }` |
| FluentValidation (`FluentValidationActionFilter`) | `{ "errors": { "Alan": ["..."] } }` |

İkincisi alan bazlı bir SÖZLÜK — tek `message` alanına indirgenmiyor.
`src/api/http.ts` → `readErrorMessage` ikisini de karşılıyor (`message` önce,
sonra `errors` içindeki ilk mesaj), bu yüzden arayüz tarafında ek iş gerekmedi.

## Kalan eksikler

| # | Eksik | Etkisi |
|---|---|---|
| 1 | **Acente kavramı sunucuda HİÇ YOK** — entity, tablo, controller, migration yok | ÇÖZÜLDÜ: alan `insuranceCompanyId` ile birleştirildi (aşağıya bakın). Yeniden ayrı bir acente modeli kurma. |
| 2 | **`SortBy`/`SortDir` yok** — sıra sunucuda sabit | Ekrandaki sıralanabilir sütun başlıkları KALDIRILDI. |
| 3 | `Search` **proje adında aramıyor** — yalnız poliçe no, birim no, abone no | Arama kutusunun etiketi ve yer tutucusu bu kapsama daraltıldı; ekran bir süre proje adında da arıyormuş gibi duruyordu. |
| 4 | **`ProjectUnitId` süzgeci YOK** | Birim bazlı poliçe listesi için uç mevcut değil. İstemcide sahte bir `ProjectUnitId` parametresi ÜRETİLMEDİ; ihtiyaç doğarsa `ProjectId` ile çekip istemcide süzmek ya da uca parametre eklenmesi gerekir. |
| 5 | Satır **bina kodu taşımıyor** | Liste ekranındaki "ProjeId" sütunu KALDIRILDI (`PolicyDto`'da karşılığı yok). |
| 6 | **Ödeme durumu alanı yok** — `Policy` entity'sinde karşılığı yok | Proje detayındaki "Ödeme: Bekliyor" rozeti bir İSTEMCİ VARSAYIMIDIR; sunucudan gelen bir değer değil. Uç geldiğinde bu sabit KALDIRILMALI. |
| 7 | **Poliçe numarası benzersizliği YOK** — ne benzersiz indeks ne denetim | ÇÖZÜLDÜ: `isPolicyNumberTaken` KALDIRILDI. Yerine sunucudaki gerçek sınır kondu (50 karakter). |

"Birim" sütunu artık eksik DEĞİL: `PolicyDto.UnitNumber` sunucudan geliyor
(liste ekranına sütun olarak henüz eklenmedi).

## Karara bağlanması gereken konular

**1. Acente alanı — KAPANDI.** Sunucuda acente kavramı olmadığı için sihirbazın
iki kutusu ("Sigorta Şirketi" + "Acente / Poliçe Firması") TEK kutuya indirildi:
etiket "Sigorta Şirketi / Poliçe Firması", alan `insuranceCompanyId`. Ayrı bir
acente tipi, sorgusu ya da modeli bırakılmadı.

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
