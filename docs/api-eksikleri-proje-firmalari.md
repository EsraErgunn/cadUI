# Proje firması yetkilendirmeleri — backend'e sorulacaklar

**Durum:** `GET/POST /api/project-firm-authorizations` ve
`GET/PUT/DELETE /api/project-firm-authorizations/{id}` **AÇILDI** (envanter:
`localhost:5193` OpenAPI, 2026-08-16, 37 yol). Uç var ama arayüzdeki
yetkilendirme formuyla alanları örtüşmüyor — aşağıdaki iki soru cevaplanmadan
`saveProjectFirmAuthorizations` gerçek uca BAĞLANMIYOR.

Okuma yönü (`GET`) bu sorulardan bağımsız ve kullanılabilir: proje oluştururken
`projectFirmAuthorizationId`'yi çözmek için sertifika numarasına da tarihlere de
gerek yok (bkz. `api-eksikleri-projeler.md`).

## Sunucunun sözleşmesi

```
GET /api/project-firm-authorizations
  ?ProjectFirmId= &GasDistributionFirmId= &GasDistributionGroupId=
  &SortBy= &SortDir= &Page= &PageSize=
→ { items, totalCount, page, pageSize }   (sayfalı zarf)

ProjectFirmAuthorizationListItemDto
  id, projectFirmId, projectFirmName,
  gasDistributionFirmId, gasDistributionFirmName,
  certificateNumber: string,          // null DEĞİL
  validFrom: date-time,
  validTo: date-time | null

ProjectFirmAuthorizationCreateDto
  projectFirmId, gasDistributionFirmId, certificateNumber, validFrom, validTo?

ProjectFirmAuthorizationUpdateDto
  certificateNumber, validFrom, validTo?     // firma çifti değiştirilemiyor
```

## S1 — `qualificationNumber` ↔ `certificateNumber` eşlemesi

Arayüz **iki** numara topluyor, sunucu **bir** tane tanıyor. Üstelik
zorunluluk yönü ters:

| Arayüz alanı | Etiket | Bizde | Sunucuda |
|---|---|---|---|
| `qualificationNumber` | "Yeterlilik No" | **zorunlu** | **karşılığı YOK** |
| `certificateNumber` | "Sertifika No" | opsiyonel | `certificateNumber` — **zorunlu** (non-nullable) |

`qualificationNumber`'ın sunucuda hiçbir yerde evi yok: `ProjectFirmListItemDto`
(`companyType, contactPerson, email, id, phone, taxNumber, title`) da taşımıyor,
`ProjectFirmCreateDto` da. Arayüzdeki `ProjectFirm.qualificationNumber` zaten
"bugün her satırda `null`" notuyla duruyor.

**Sorulacak:** İkisi aynı şey mi (arayüz gereksiz yere ikiye bölmüş), yoksa
Yeterlilik No ayrı bir kavram mı ve uca `qualificationNumber` eklenecek mi?

Bu netleşmeden yazma yoluna geçilirse kullanıcının "Yeterlilik No" alanına
girdiği veri sessizce kaybolur — alan zorunlu olduğu için de her kayıtta
kaybolur.

## S2 — `validFrom` / `validTo` formda toplanacak mı?

`validFrom` **zorunlu**, `validTo` opsiyonel. Arayüzün yetkilendirme kartında
(`ProjectFirmAuthorizationCard.tsx`) tarih alanı **yok**.

**Sorulacak:** Geçerlilik penceresi kullanıcıdan mı alınacak (form iki tarih
alanı kazanır), yoksa sunucu bir varsayılan mı üretiyor (örn. `validFrom` =
kayıt anı, `validTo` = null)?

Uydurma bir `validFrom` göndermek kayda yanlış veri yazar; bu yüzden bugün
`saveProjectFirmAuthorizations` mock kalmaya devam ediyor.

İlgili: uçta `onlyValid` / tarih süzgeci YOK. Süresi geçmiş yetkiler istemcide
ELENİYOR ve kural tek kapıdan geçiyor (`getEffectiveAuthorizations`, K86) —
yetki verisini okuyan dört yerin dördü de aynı fonksiyonu kullanıyor.

## S6 — Bir firma çifti için birden fazla yetki satırı olabilir mi?

`GET ...?ProjectFirmId=X&GasDistributionFirmId=Y` sayfalı zarf döndürüyor, yani
sözleşme birden fazla satıra izin veriyor. Yenilenen belgeler ayrı satırlar
olarak mı duruyor (aynı çift için tarihleri farklı N kayıt), yoksa çift başına
tek satır mı garanti?

Bu, proje oluştururken hangi `projectFirmAuthorizationId`'nin gövdeye
konulacağını belirliyor. Cevap gelene kadar arayüz **yürürlükteki** kaydı
seçiyor (`validFrom <= şimdi` ve `validTo` boş ya da gelecekte); birden fazlaysa
`validFrom` en yeni olanı. Kural `api/projectFirmAuthorizations.ts` içinde tek
yerde ve testli.

## KK-20 daraltması — BAĞLANDI, yetki ucundan (`/api/projectfirms` süzgeci değil)

KK-20, yetki satırındaki proje firması seçeneklerini "seçilen G.D. firmasında
yeterliliği olan" firmalarla sınırlamak istiyor. Bağlandı: `getAuthorizedProjectFirms`
artık `GET /api/project-firm-authorizations?GasDistributionFirmId=` okuyor
(gövdesi `api/projectFirmAuthorizations.ts`, Yeni Proje formundaki aynası
`getAuthorizedGasFirms`'in yanında).

Aynı pull'da `/api/projectfirms` de süzgeç kazanmıştı ve önce **o** aday
gösterilmişti:

```
GET /api/projectfirms?GasDistributionFirmId=<gdf>
  &GasDistributionGroupId= &SortBy= &SortDir= &Page= &PageSize=
→ { items: [ProjectFirmListItemDto], totalCount, page, pageSize }
```

Gerekçesi şuydu: satırları doğrudan firma, `FirmReference`'a eşlemesi bire bir,
yetki ucundaki gibi tekilleştirme (S6) gerektirmiyor.

**Neden yine de yetki ucu seçildi:** `/api/projectfirms` satırı `validFrom`/
`validTo` TAŞIMIYOR ve uçta `onlyValid` de yok. Süresi dolmuş yetkiyi elemek
istemcide yapılmak zorunda olduğuna göre, tarihleri getiren tek kaynak yetki
ucu. Kısa yol seçilseydi süresi geçmiş bir yetkiyle bağlı firma da seçenek
olarak çıkar, hata ancak kaydetmeye basınca görünürdü — Yeni Proje formunda tam
olarak bu yaşanmıştı. Tekilleştirme ise ölçüldüğünde üç satır (`toFirmOptions`,
iki yönde ortak). Ayrıntı: docs/kararlar.md K86–K87.

`/api/projectfirms?GasDistributionFirmId=` süzgeci, ucun `validTo`/`onlyValid`
bilgisini vermesi hâlinde tek istekle aynı işi yapabilir; o zaman geçiş
`getAuthorizedProjectFirms`'in içinde, imza değişmeden olur.

## S7 — KK-5: satırlar yetki bazlı olacaksa yetki başına hangi eylemler sunulacak?

**Durum: veri VAR, uygulanmadı.** "Bir firmanın her G.D. yetkisi ayrı satır"
(KK-5) için gereken bağ artık geliyor (`GET /api/project-firm-authorizations`),
yani düzleştirme teknik olarak mümkün. Yapılmadı çünkü engel veri değil EKRAN:

- Proje firmaları listesindeki **İşlemler sütunu FİRMA bazlı**. "Sil"
  `DELETE /api/projectfirms/{id}` çağırıyor ve onay metni "Firma listelerden
  kaldırılacak" diyor. Üç yetkisi olan firma üç satır olsaydı aynı yıkıcı düğme
  üç kez görünür, birine basmak üç satırı birden silerdi.
- Yetki BAZLI bir eylem sunulamıyor: `PUT`/`DELETE /api/project-firm-authorizations/{id}`
  uçları sunucuda var ama arayüzün yetki yazma yolu S1/S2 yüzünden hâlâ mock
  (`saveProjectFirmAuthorizations`). Yani "bu yetkiyi sil" düğmesi bugün hiçbir
  şey yazmazdı.
- "Firma Adı" bağlantısı da firma güncelleme ekranına gidiyor; tekrarlanan
  satırlarda aynı hedefi gösterirdi.
- Yetkisi olmayan firma satırsız kalmamalı, yani düzleştirme yine de boş değerli
  bir satır üretmek zorunda.

Bugünkü davranış: satır = firma, hücrede firmanın BUGÜN geçerli yetkilerinin
G.D. firmaları alt alta, hiç yoksa ortak boş değer işareti (uydurma metin yok).
Başlıktaki adet bu yüzden **tekil firma sayısı**.

**Analiste sorulacak:** satırlar yetki bazlı olacaksa yetki başına hangi
eylemler sunulacak (yetkiyi düzenle / yetkiyi sil ayrı mı, firma silme nereye
taşınır)? Cevap S1/S2 ile birlikte gelmeli — yetki yazma uçları netleşince bu
karar yeniden değerlendirilecek.

## Arayüzdeki karşılıkları

| Yer | Bugün | Uç bağlanınca |
|---|---|---|
| `api/projectFirmForm.ts` `saveProjectFirmAuthorizations` | HER ZAMAN mock | S1+S2 sonrası `POST`'a döner, imza aynı kalır |
| `api/projects.ts` yetki kimliği | ~~sabit (`= 1`)~~ → **bağlandı** (2026-08-16) | — |
| `getAuthorizedProjectFirms` (KK-20 daraltması) | ~~tüm firmalar~~ → **bağlandı** (2026-08-17) | — |
| Proje firmaları listesi "G.D. Firması" sütunu | ~~hep "-"~~ → **bağlandı** (2026-08-17), `ProjectFirmRow.gasFirms` çoğul | — |
| KK-5 (her yetki ayrı satır) | UYGULANMADI — veri var, ekran uygun değil (S7) | S1+S2 sonrası yeniden değerlendirilecek |

Arayüz tarafındaki yetkilendirme FORM taslağı `ui/admin/projectFirms/authorizationDraft.ts`
(eski adı `projectFirmAuthorizations.ts`; API sözleşmesini taşıyan
`api/projectFirmAuthorizations.ts` ile karışmasın diye ayrıldı).
