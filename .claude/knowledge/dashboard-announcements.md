# gotcha: Anasayfa iki kaynaktan beslenir — duyurular tarayıcıda

Karar: docs/kararlar.md K48, K76.

## Sayaçlar gerçek, duyurular değil

`getDashboardSummary` tek bir `DashboardSummary` döndürür ama iki yerden toplar:

| Parça | Kaynak |
|---|---|
| Sayaçlar, "bugün", yoğunluk | **gerçek** `GET /api/admin/dashboard` |
| Duyurular | **yerel** `announcementStore.ts` (`localStorage`) |

Kartlar iki ayrı yükleme durumu yönetmesin diye tek nesnede birleşiyorlar. Uç
duyuru döndürmeye başladığında birleştirme satırı silinir, gerisi değişmez.

## Yoğunluk alanı `density`, satır `{ id, name, projectCount }`

Coğrafi bölge kavramı kalkınca `regionDensity: [{ regionId, regionName,
projectCount }]` tümüyle YOK oldu. Yanıt `density` + kırılımın boyutunu söyleyen
`densityBy` taşıyor ve **ekranın iç tipi de aynı adlarla** duruyor: eşleme
katmanı yalnız sayaçlarda kaldı, yoğunluk satırı olduğu gibi geçiyor.

`densityBy` kart BAŞLIĞINI seçiyor (grup/firma) ve bu yüzden artık zorunlu; ama
tanınmayan değer `.catch('group')` ile gruba düşüyor — sayıları değil metni
seçen bir alan uğruna bütün panel hata ekranına dönmesin. `generatedAt`
kullanılmadığı için hâlâ opsiyonel. (bkz. admin-scope.md)

## Kapsam `gdGroupId` VEYA `gdFirmId` olarak GİDİYOR, `dayKey` gitmiyor

Kapsam üç hâlli: sistem geneli (parametre YOK), grup (`gdGroupId`) veya tek gaz
dağıtım firması (`gdFirmId`). İkisi ASLA birlikte gitmez — kural `AdminScope`
ayrık birleşimiyle tipte garanti (`api/adminDashboard.ts`), sorguyu ucun kendi
`withScopeQuery`'si
kuruyor. Süzme sunucuda; istemci diziyi daraltmıyor. Kapsam yokken parametre HİÇ
yazılmaz (boş `gdGroupId=` ayrı anlam taşıyabilir).

`dayKey` uca gitmez: "bugün" sayaçlarını sunucu kendi gününe göre hesaplıyor,
anahtar istemcide yalnız TanStack Query anahtarı olarak yaşıyor.

## Özet hatası MOCK'A YUTULMAZ (K76)

404/501/ağ hatası → mock yedeği KALDIRILDI; uç artık var, hata `QueryError`
şeridine düşer. `isMissingEndpoint`/`warnOnceAboutMissingEndpoint` duruyor ama
YALNIZ duyuru yollarına ait.

Mock gövde silinmedi: `VITE_API_URL` tanımsızken (backend'siz geliştirme) ekran
hâlâ `adminDashboardMock.ts`'ten besleniyor, kapsam orada da çalışıyor. Testte
API kökü TANIMLI olduğu için mock yolu `getDashboardSummary` üzerinden
sınanamaz — `queryMockDayActivity`/`allMockScopeFacts` doğrudan çağrılır.

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
