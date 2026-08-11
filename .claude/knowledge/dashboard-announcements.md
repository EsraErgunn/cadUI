# gotcha: Anasayfa iki kaynaktan beslenir — duyurular tarayıcıda

Karar: docs/kararlar.md K48.

## Sayaçlar gerçek, duyurular değil

`getDashboardSummary` tek bir `DashboardSummary` döndürür ama iki yerden toplar:

| Parça | Kaynak |
|---|---|
| Sayaçlar, "bugün", bölge yoğunluğu | **gerçek** `GET /api/admin/dashboard` |
| Duyurular | **yerel** `announcementStore.ts` (`localStorage`) |

Kartlar iki ayrı yükleme durumu yönetmesin diye tek nesnede birleşiyorlar. Uç
duyuru döndürmeye başladığında birleştirme satırı silinir, gerisi değişmez.

## Bölge yoğunluğu kartı BOŞ — bozuk değil

Uç `regionDensity: []` döndürüyor. Sunucudaki yoğunluk kavramı karttakiyle aynı
değil:

- sunucu: COĞRAFİ bölge başına **proje adedi** (`{ regionId, regionName, projectCount }`)
- kart: bölge başına **üç sayaç** (G.D. kullanıcısı / proje firması / proje firması kullanıcısı)
- istenen: **grup firması** bazlı (AKSA, ENERYA…) — sunucuda hiç yok

Boş bırakıldı; mock sayıyla doldurmak sahte veriyi gerçek gibi gösterirdi.
Grup bazlı yoğunluk istenirse backend'de yeni bir uç gerekir.

## `date` ve bölge uca GİTMİYOR

Uç yalnız `regionId` alıyor. Gün anahtarı istemcide sorgu anahtarı olarak
kalıyor (gün dönünce veri tazelensin); bölge ise ADLA taşındığı ve sunucu
KİMLİK beklediği için gönderilmiyor. `getDashboardSummary(region, dayKey)`
imzası korunuyor — bölge yalnız DUYURU süzmesinde kullanılıyor.

## Duyuru kalıcılığı sahte, ama gizli değil

`localStorage` yalnız o tarayıcıda. Ekrandaki "sunucuya yazılmıyor" uyarısı
KALDIRILMAMALI: kullanıcı "yayınladım, herkes gördü" sanmamalı.

Depodan okunan veri dış kaynak sayılır ve zod'dan geçer (kullanıcı depoyu elle
düzenleyebilir, eski sürüm başka biçim yazmış olabilir). Bozuk içerik sessizce
yok sayılır — anasayfa duyuru yüzünden çökmez.

Testlerde `clearStoredAnnouncements()` çağrılmazsa kayıtlar test dosyaları
arasında sızar; `adminDashboard.test.ts` bunu `beforeEach`/`afterEach`'te yapıyor.

## Duyuru uçları ağa hiç çıkmaz

Karar `hasApiBaseUrl`'e değil UÇ BAZLI bayrağa bağlı
(`unimplementedEndpoints.ts` → `announcementList`, `announcementPublish`; K46).
Eskiden her yayınlamada bir 404 gidiyor, sonra mock'a düşülüyordu.
