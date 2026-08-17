# Proje detayı — eksik uçlar ve sözleşme taslağı

**Durum:** Ekran yazıldı, sunucu tarafının büyük kısmı YOK. Bu belge backend'den
istenecekleri tek yerde toplar. Envanter `localhost:5193` OpenAPI'sinden
çıkarıldı (**2026-08-16**, 37 yol) ve cadapi entity'leriyle karşılaştırıldı.

Sözleşme taslağı FRONTEND önerisidir; alan adları backend'le kesinleşecek.

## Bugün çalışan tek uç

`GET /api/projects/{id}` → `ProjectDetailDto`

Ekrana taşınan alanlar: `id`, `name`, `description`, `code`, `cityName`,
`districtName`, `addressLine`, `blockLotParcel`, `createdAt`, `updatedAt`.

`ProjectDetailDto` 2026-08-16 itibarıyla ÇOK daha geniş: `projectTypeName`,
`heatingTypeName`, `buildingUsageTypeName`, `isPermitProject`, `apartmentCount`,
`workplaceCount`, `areaSquareMeters`, `capacity`, `serviceBoxPressureMbar`,
`coverNote`, `connectionObject` de geliyor. 1 numaralı ucun kapsamı bu yüzden
daraldı — aşağıdaki tabloya bak.

Yanıttaki `gasDistributionFirmRegionId` alanı **`gasDistributionFirmId` oldu**
(bölge kavramı kalktı, K79). `projectFirmAuthorizationId` ise artık ÇÖZÜLEBİLİR:
`GET /api/project-firm-authorizations` açıldı (bkz.
`api-eksikleri-proje-firmalari.md`).

## Eksik uçlar

| # | Uç (öneri) | Ne besleyecek | Karşılığı olan entity |
|---|---|---|---|
| 1 | `GET /api/projects/{id}/detail` | **Kapsam daraldı** — tip/teknik alanlar artık `GET /api/projects/{id}`'de. Kalan eksikler: **durum**, tesisat no, mahalle, sokak/kapı no, firma mühendisi + GDF kayıt no + yeter no, onay bilgileri | `Project` (+`Building`, `Code`) — alanların bir kısmı tabloda VAR |
| 2 | `GET /api/projects/{id}/units` | Birim / Cihaz tablosu (14 sütun) | `ProjectUnit`, `Device` — **tablolar var, controller yok** |
| 3 | ~~`GET /api/projects/{id}/operation-history`~~ | **AÇILDI** → `GET /api/projects/{projectId}/history`, düz dizi (`OperationHistoryListItemDto[]`). Bağlanmadan önce aşağıdaki S3'e cevap gerekiyor | `OperationHistory` |
| 4 | `GET /api/projects/{id}/docs` | Evrak listesi | `Doc` + `ProjectDoc` — **tablolar var** |
| 5 | `GET /api/projects/{id}/policies` | Poliçe listesi | `Policy` (ProjectUnit'e bağlı) — **tablo var** |
| 6 | ~~`POST /api/projects/{id}/decision`~~ | **KISMEN AÇILDI** → tek uç değil, üç ayrı uç: `POST .../submit`, `.../approve`, `.../reject` (`{ description }` zorunlu). Revizyon YOK, onay kodu dönmüyor — S4/S5 | — |
| 7 | `GET /api/projects/{id}/zpd` | "Zetacad Proje Dosyası" indirme | — |
| 8 | `GET /api/projects/{id}/report.pdf` | "PDF İndir" / "PDF Rapor Al" | — |

Frontend'deki bayraklar: `src/api/unimplementedEndpoints.ts`. Uç açılınca
oradaki satır silinir ve çağıran dosya derleme hatası verir.

## Backend'e sorulacaklar (2026-08-16, açılan uçlar sonrası)

Aşağıdaki üçü cevaplanmadan `projectHistory` ve `projectDecision` bayrakları
kaldırılamaz — uçlar VAR ama gövdeleri bu sorular olmadan doğru yazılamaz.

### S3 — `operationCode` hangi değerleri alıyor?

`OperationHistoryListItemDto.operationCode` Swagger'da yalnız `string`. Arayüzün
`HistoryOperation` union'ı bugün BEŞ değer varsayıyor (`projeKayit`,
`projeGuncelleme`, `projeOnay`, `projeRet`, `revizyonTalebi`) ve bu bir TAHMİN.
Tam liste gerekiyor; `z.enum` tanımadığı kodda satırı düşürür.

İkinci soru: yanıt `operationName`'i de taşıyor (sunucu tarafı Türkçe etiket).
Etiketin sahibi kim — sunucu mu, arayüzdeki `HISTORY_OPERATION_LABELS` mi? İkisi
birden kalırsa aynı metin iki yerde ayrışır.

Üçüncüsü: arayüzün geçmiş tablosunda **dosya tipi** sütunu var
(`ProjectHistoryRow.fileType`: `'pdf' | 'zpd'`). Yanıtta karşılığı YOK. Sütun
kalkacak mı, yoksa uca alan mı eklenecek?

### S4 — Onay kodu onaydan sonra nereden okunacak?

`POST /api/projects/{projectId}/approve` **gövdesiz 200** dönüyor.
`ProjectDetailDto`'da ne onay kodu ne de `status` alanı var (`status`/
`statusName` yalnız `ProjectListItemDto`'da). KK-11 onayda bir onay kodu
üretilmesini istiyor; arayüzdeki `ProjectDecisionResult.approvalCode` bugün
karşılanamıyor.

Seçenekler: (a) `approve` yanıtı `{ approvalCode, status }` döndürsün,
(b) `ProjectDetailDto`'ya `status` + `approvalCode` eklensin. Biri seçilmeden
onay ekranı sonucu kullanıcıya doğru gösteremez.

### S5 — Revizyon talebi için uç planlanıyor mu?

Arayüzün `ProjectDecision` tipi üç değerli: `approve` / `reject` /
`requestRevision`. Sunucuda **`requestRevision`'ın karşılığı yok** — yalnız
`submit`/`approve`/`reject` var ve `ProjectStatusCountsDto` da dört durum
sayıyor (`draft`, `pendingApproval`, `approved`, `rejected`).

Bu, aşağıdaki "Revizyon İstendi durumu yok" maddesinin uç tarafındaki yüzü:
kod grubuna beşinci kayıt eklenecekse ona yazan bir uç da (`POST
.../request-revision`) gerekiyor.

**Ters yönde bir eksik daha:** sunucuda `POST .../submit` (onaya gönder) VAR ama
arayüzün karar modelinde yok. `ProjectDecision` bu geçişi de kapsayacak şekilde
genişletilmeli.

## Karara bağlanması gereken iki konu

**1. "Revizyon İstendi" durumu yok.** `ProjeDurumu` kod grubu (id 6) tam dört
kayıt taşıyor: `Draft`(6001), `PendingApproval`(6002), `Approved`(6003),
`Rejected`(6004). Gereksinim (KK-11) revizyonu bir DURUM olarak istiyor —
revizyon talebi projenin durumunu gerçekten değiştiriyor, firma düzeltip yeniden
göndermek zorunda. Kod grubuna beşinci bir kayıt gerekiyor; frontend'deki
`revizyonIstendi` sabiti bugün istemci uydurmasıdır ve o kod gelince
eşitlenecek.

**2. Tesisat verisi hiç kaydedilmiyor.** `POST /api/projects/{projectId}/newversion`
ile MinIO'ya yazılan JSON yalnız mimari katmanı taşıyor
(`floors/points/walls/openings/rooms/symbols/areaObjects`). Boru, servis kutusu,
sayaç ve cihazlar istemcide `plumbing/` tarafında duruyor ve hiçbir yere
yazılmıyor. Sonuç:

- Proje detayındaki plan görüntüleyici tesisat elemanlarını gösteremiyor
  (gereksinim 3.5 / KK-7'nin "etiketleriyle" kısmı).
- 2 numaralı uç (`/units`) sunucuda doldurulacaksa verinin oraya nasıl
  ulaşacağı belirsiz: ZetaCAD'den mi gelecek, çizim JSON'una mı eklenecek?

Bu ikisi çözülmeden ilgili bölümler örnek veriyle çalışmaya devam edecek
(yalnız geliştirme derlemesinde; üretimde boş görünürler).

## Ek not — bildirim

KK-11 "girilen gerekçe firma kullanıcısına bildirim olarak iletilir" diyor.
Bildirim varlığı sunucuda yok (tablo/uç aranmadı, `OperationHistory` dışında
karşılığı görünmüyor). 6 numaralı uç bunu da kapsamalı; frontend bugün işlemin
sunucuya yazılmadığını ve bildirimin gitmediğini kullanıcıya açıkça söylüyor.
