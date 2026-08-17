# Projeler — analiste sorulacaklar

**Durum:** `POST /api/projects` çalışıyor ve form alanlarının tamamını
saklıyor (2026-08-16 doğrulaması). Bu belge ucun ÇALIŞTIĞI ama veri modelinin
sorgulanması gereken noktalarını toplar.

## Açık soru — kapasite ondalık olabilmeli mi?

`ProjectCreateDto.capacity` ve `ProjectUpdateDto.capacity` sunucuda **int32**.
Ondalık gövde 400 alıyor; doğrulama hatası da alan bazlı değil, ham JSON
dönüştürme hatası olarak geliyor:

```
POST /api/projects   { ..., "capacity": 4.5 }
→ 400
  "$.capacity": ["The JSON value could not be converted to
                 System.Nullable`1[System.Int32]."]
```

Frontend bugün buna UYUYOR: "Kapasite (m³/h)" alanı ondalık ayraç kabul
etmiyor, zod şeması da tam sayı zorunlu tutuyor
(`src/ui/admin/projects/newProjectSchema.ts`).

**Soru:** doğalgaz kapasitesi sahada ondalıklı olabiliyor (4,5 m³/h gibi).
Veri modeli tam sayıysa kullanıcı değeri yuvarlamak zorunda kalacak ve
kaydedilen değer sahadakinden sapacak. Bu bilinçli bir karar mı, yoksa
kolonun tipi mi yanlış?

Üç seçenek var, hangisinin doğru olduğu ANALİZ kararı:

1. **Kapasite gerçekten tam sayı** — saha değerleri yuvarlanabilir. O zaman
   arayüzün bugünkü davranışı doğru, yapılacak bir şey yok; ama kullanıcıya
   "tam sayı giriniz" beklentisini yazmak gerekebilir.
2. **Ondalık olmalı** — kolon `decimal(x,y)` olmalı, DTO da öyle. Bu durumda
   `capacity` alanının tipi, arayüzdeki tam sayı kısıtı ve şema kuralı BİRLİKTE
   değişir (üç yerde tek karar).
3. **Birim değişmeli** — kapasite m³/h yerine daha küçük bir birimde (dm³/h
   gibi) tam sayı olarak saklanır. Bu, ekranda gösterilen birimi
   değiştirmeyeceği için dönüşümün nerede yapılacağı ayrıca kararlaştırılmalı.

Karara kadar arayüz 1. seçeneğe göre davranıyor — DTO'ya uygun olan bu ve
ondalık girişi geçirmek kullanıcıya kaydedilmeyecek bir değer yazdırırdı.

Aynı soru `serviceBoxPressureMbar`, `areaSquareMeters`, `apartmentCount` ve
`workplaceCount` için AÇILMIYOR: dördü de doğası gereği tam sayı (mbar
tamsayı okunuyor, alan m² tam sayı yeterli, adetler zaten sayılabilir).

## ~~İstenen uç~~ — proje firmasının yetkileri: **AÇILDI (2026-08-16)**

> **Bu bölümdeki talep karşılandı.** Uç `GET /api/project-firm-authorizations`
> olarak geldi — önerilenden farklı yolda ve sayfalı zarfla, ayrıca bölge değil
> **firma** bazlı (`GasDistributionFirmId`, bkz. K79). Aşağıdaki taslak tarihsel
> kayıt olarak duruyor; güncel sözleşme
> `api-eksikleri-proje-firmalari.md` içinde.
>
> ```
> GET /api/project-firm-authorizations
>   ?ProjectFirmId= &GasDistributionFirmId= &GasDistributionGroupId=
>   &SortBy= &SortDir= &Page= &PageSize=
> → { items: [{ id, projectFirmId, projectFirmName,
>               gasDistributionFirmId, gasDistributionFirmName,
>               certificateNumber, validFrom, validTo }], totalCount, page, pageSize }
> ```
>
> 1. maddedeki sabit bu uçla kalkıyor. 2. maddedeki daraltma için ayrıca
> `GET /api/projectfirms?GasDistributionFirmId=` de kullanılabilir.

Bağımlılık GERÇEK ve kavramsal olarak doğru: `ProjectFirmAuthorizations`
tablosu `ProjectFirmId × GasDistributionFirmRegionId` satırı tutuyor, yani bir
proje firması **yalnızca yetkilendirildiği GDF-bölgelerinde** proje açabiliyor.
Sorulacak şey "bu bağımlılık var mı" değil, **"bu bağı veren uç ne zaman
gelecek"**.

Aynı uç iki ayrı eksiği birden kapatıyor — ayrı talepler değil, tek talep:

1. **Gövdeye giden yetki kimliği.** `POST /api/projects` firma kimliği değil
   `projectFirmAuthorizationId` istiyor. Bugün istemcide SABİT
   (`SEEDED_PROJECT_FIRM_AUTHORIZATION_ID = 1`, `src/api/projects.ts`), çünkü
   seçilen firmadan bu kimliğe inecek bir yol yok.
2. **GD firması kutusunun daraltılması.** Kutu, proje firması seçilene kadar
   pasif ve firma değişince seçim temizleniyor (`applyDependencies`) — kural
   doğru, ama liste `GET /api/gasdistributionfirms`'ten TÜMÜYLE geliyor ve
   yetkilere göre daralmıyor.

**Sözleşme taslağı (frontend önerisi):**

```
GET /api/projectfirms/{projectFirmId}/authorizations
→ [{ id, gasDistributionFirmId, gasDistributionFirmName }]
```

`id` doğrudan 1. maddedeki `projectFirmAuthorizationId`; `gasDistributionFirm*`
alanları 2. maddedeki kutuyu dolduruyor. Yani kullanıcı GD firmasını seçtiğinde
gövdeye gidecek yetki kimliği de belli oluyor ve sabit kalkıyor.

Kural uç gelene kadar SÖKÜLMÜYOR: bugünkü uç daraltmadığı için pasifliği
kaldırmak, uç geldiğinde aynı kuralı geri koymak olurdu.
`NewProjectInfoCard.tsx` içinde TODO ile işaretli.

## Eksik alan — "S.K. Modeli" formda yok

Sunucuda `ServiceBoxModel` kod grubu (GroupId 32) DOLU:

| id | name | codeValue |
|---|---|---|
| 3201 | CES 200 | `CES200` |
| 3202 | S 200 | `S200` |
| 3203 | S 300 | `S300` |

Yeni Proje formunda buna karşılık gelen bir alan YOK. Form servis kutusuyla
ilgili yalnız "S.K. Basıncı (mbar)" alanını taşıyor.

Alan KENDİLİĞİNDEN EKLENMEDİ, çünkü ekleyecek yer de yok: `ProjectCreateDto`
ve `ProjectUpdateDto` bir servis kutusu modeli alanı taşımıyor, yani seçim
gövdeye konsa sunucu onu sessizce atardı.

**Soru:** S.K. modeli projeye mi ait, yoksa tesisat çiziminin bir özelliği mi?

Muhtemel cevap ikincisi: servis kutusu `plumbing/` tarafında zaten bir ÇİZİM
ELEMANI (`ServiceBox`, kökte tek nesne — `core/model.ts`). Kod grubu bu
durumda doğru yerde duruyor, ama tükettiği yer form değil çizim tarafındaki
eleman özelliği; formda hiç yeri yok ve bu madde kapanır.

Diğer ihtimal projeye ait olması: o zaman `ProjectCreateDto`/`ProjectUpdateDto`
bir `serviceBoxModelCodeId` alanı almalı ve forma bir kutu eklenmeli. DTO'da
alan yokken kutuyu eklemek veriyi sessizce çöpe atardı, o yüzden beklendi.

## Doğrulanan davranış — rol kapısı

`POST /api/projects` yetkilendirmesi "yalnız admin" DEĞİL. 2026-08-16'da
Development seeder kullanıcılarıyla ölçüldü:

| Kullanıcı | roleCode | Sonuç |
|---|---|---|
| `admin` | `Admin` | 200 |
| `proje` | `ProjectFirmUser` | **200** |
| `dagitim` | `GasDistributionUser` | 403 |
| (token yok) | — | 401 |

Yani kapı gaz dağıtım kullanıcısına kapalı; proje firması kullanıcısı proje
AÇABİLİYOR. Arayüzün `useIsAdmin` ile yaptığı ayrım da bununla tutarlı:
firma seçimi yalnız admin'e görünür, proje firması kullanıcısı formu
firmasız doldurur. Bu ayrım GÖRÜNÜRLÜK içindir, yetki kararı sunucuda.

`projectFirmAuthorizationId` var olmayan bir kimlikle gönderilirse uç 404 +
`{"message":"Proje firması yetkisi bulunamadı."}` dönüyor. Yetkinin çağıran
kullanıcıya AİT olup olmadığının denetlenip denetlenmediği ölçülmedi —
`proje` kullanıcısı da 1 numaralı yetkiyle kayıt açabildi, ama seed'de tek
yetki kaydı olduğu için bu bir kanıt değil. İkinci bir yetki kaydı
oluşturulunca sınanmalı.

## İstemci tarafı borç — mock'a düşme davranışı TUTARSIZ

Yeni Proje formundaki iki firma kutusu aynı ekranda ama `VITE_API_URL`
tanımsızken FARKLI davranıyor:

| Veri katmanı | Uç | API kökü yokken |
|---|---|---|
| `fetchAllFirms` (`adminFirms.ts`) | `GET /api/gasdistributionfirms` | mock gövdeye düşer (`hasApiBaseUrl`) |
| `getProjectFirmList` (`projectFirms.ts`) | `GET /api/projectfirms` | düşmez — `NetworkError`, ekran hatayı gösterir |

Yani backend'siz geliştirmede GD kutusu sahte listeyle dolarken proje firması
kutusu hata gösteriyor. Asimetri bu turda GETİRİLMEDİ; yeniden kullanılan iki
katmandan miras.

**Doğru olan mock'a DÜŞMEYEN davranış** (K51'in ruhu: sahte veri gerçekten
ayırt edilebilir olmalı, sessizce gerçeğin yerine geçmemeli — `projectFirms.ts`
kendi başlığında bu gerekçeyi zaten yazıyor). Ama düzeltme TEK EKRANDA
yapılmaz: `hasApiBaseUrl` yedeği `adminFirms`, `adminFirmForm`,
`adminDashboard` ve `projectFirmForm`'da da var. Tümü birden hizalanacak,
ayrı iş.
