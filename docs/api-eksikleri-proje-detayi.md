# Proje detayı — eksik uçlar ve sözleşme taslağı

**Durum:** Ekran yazıldı, sunucu tarafının büyük kısmı YOK. Bu belge backend'den
istenecekleri tek yerde toplar. Envanter `localhost:5193` OpenAPI'sinden
çıkarıldı (2026-08-11) ve cadapi entity'leriyle karşılaştırıldı.

Sözleşme taslağı FRONTEND önerisidir; alan adları backend'le kesinleşecek.

## Bugün çalışan tek uç

`GET /api/projects/{id}` → `ProjectDetailDto`

Ekrana taşınan alanlar: `id`, `name`, `description`, `code`, `cityName`,
`districtName`, `addressLine`, `blockLotParcel`, `createdAt`, `updatedAt`.

Yanıttaki `projectFirmAuthorizationId` ve `gasDistributionFirmRegionId`
KULLANILAMIYOR: bu kimlikleri ada/firmaya çözen bir uç yok (aynı boşluk
K49'daki sabitin de sebebi).

## Eksik uçlar

| # | Uç (öneri) | Ne besleyecek | Karşılığı olan entity |
|---|---|---|---|
| 1 | `GET /api/projects/{id}/detail` | Durum, tesisat no, proje/ısınma tipi, müstakil, ruhsat, mahalle, sokak/kapı no, firma mühendisi + GDF kayıt no + yeter no, onay bilgileri, teknik değerler | `Project` (+`Building`, `Code`) — alanların bir kısmı tabloda VAR |
| 2 | `GET /api/projects/{id}/units` | Birim / Cihaz tablosu (14 sütun) | `ProjectUnit`, `Device` — **tablolar var, controller yok** |
| 3 | `GET /api/projects/{id}/operation-history` | İşlem geçmişi sekmesi | `OperationHistory` — **tablo var** (`UserId`, `OperationKodId`, `RoleSnapshot`, `Description`) |
| 4 | `GET /api/projects/{id}/docs` | Evrak listesi | `Doc` + `ProjectDoc` — **tablolar var** |
| 5 | `GET /api/projects/{id}/policies` | Poliçe listesi | `Policy` (ProjectUnit'e bağlı) — **tablo var** |
| 6 | `POST /api/projects/{id}/decision` | Onay / ret / revizyon; onay kodu üretir, durumu günceller, geçmişe kayıt düşer, firmaya bildirim gönderir | — |
| 7 | `GET /api/projects/{id}/zpd` | "Zetacad Proje Dosyası" indirme | — |
| 8 | `GET /api/projects/{id}/report.pdf` | "PDF İndir" / "PDF Rapor Al" | — |

Frontend'deki bayraklar: `src/api/unimplementedEndpoints.ts`. Uç açılınca
oradaki satır silinir ve çağıran dosya derleme hatası verir.

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
