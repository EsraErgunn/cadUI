# decision: Proje detayı ekranı — karma veri, sekme çelişkisi, plan görüntüleyici

Ekran: `src/pages/ProjectDetailPage.tsx`, parçalar `src/ui/admin/projectDetail/`,
veri katmanı `src/api/projectDetail.ts` (+ `projectDetailTypes.ts`,
`projectDetailMock.ts`). Kararların tamamı docs/kararlar.md K50–K56.

## Bu ekranda varsayım kodlamadan önce bilinmesi gerekenler

**Ekranın verisinin çoğu sunucuda YOK.** Gerçek olan tek uç
`GET /api/projects/{id}` ve yalnız şunları döndürüyor: `id`, `name`,
`description`, `code`, `cityName`, `districtName`, `addressLine`,
`blockLotParcel`, `createdAt`, `updatedAt`. Durum, tesisat no, proje/ısınma
tipi, müstakil, ruhsat, firma mühendisi, onay bilgileri, teknik değerler,
birim/cihaz, işlem geçmişi, evrak, poliçe, onay/ret/revizyon ve
`.zpd`/DWG/PDF indirme **yok**. Liste: `docs/api-eksikleri-proje-detayi.md`.

**Gerçek ile uydurma TİPTE ayrı.** `ProjectDetail = { server, extras }`.
`extras` ucu olmayan alanları taşır ve üretimde `null` olabilir; bu iki parçayı
düz bir nesnede birleştirirsen ayrım kaybolur.

⚠️ `mockGate.ts` ve `Sourced<T>` zarfı SİLİNDİ (K160): sekme verisi düz `T`
gelir ve `undefined` "yükleniyor" demektir, "kaynağı yok" değil.

**Uç bayrakları `unimplementedEndpoints.ts`'te ve mekanizma sınandı:** bir
anahtar silinince çağıran dosya TS2345 verir (ölçüldü). Tek boşluk, hiç çağrısı
olmayan bayraktır — yeni bayrak eklerken en az bir `isEndpointImplemented('…')`
çağrısı yazılmalı, yoksa bayrak sessiz kalır.

## Sık düşülecek tuzaklar

- **Evrak sekmesi artık BOŞ DEĞİL.** Eskiden `buildMockProjectDocuments` bilerek
  `[]` dönüyordu ("dolu bir liste uydurmak, olmayan bir evrakın indirilebilir
  sanılmasına yol açardı"). Evraklar ekranı yazılınca ortak bir bellek deposu
  doğdu ve sekme oradan besleniyor — gereksinim 12 ("yüklenen evrak projenin
  listesine de yansır") ancak tek depoyla doğru olur. Eski gerekçe karşılandı:
  tohumlanan satırların arkasında dosya YOK (`url: null`), adları bağlantı değil.
  Bkz. [documents-screens](./documents-screens.md), K57–K58.
- **`revizyonIstendi` sunucuda YOK.** `ProjeDurumu` kod grubu tam dört kayıt
  taşıyor (`Draft`/`PendingApproval`/`Approved`/`Rejected`, cadapi seed
  6001–6004). Beşinci durum istemci uydurmasıdır ve geçicidir; entegrasyonda
  sunucunun `CodeValue`'suyla eşitlenmeli.
- **Liste ile detay aynı proje için farklı durum gösterebilir.** `GET
  /api/projects` durum döndürmediği için liste her kaydı "taslak" sayıyor
  (`projects.ts` → `API_PROJECT_STATUS`), detay ise mock durumu kimlikten
  türetiyor. Bu bilinçli ve geçici; sunucu durumu döndürünce ikisi de düzelir.
- **Kaydedilen çizimde TESİSAT YOK.** `saveProjectVersion` yalnız
  `selectProjectData`'yı yazar; `ProjectData` mimari alanlardan ibaret. Boru,
  servis kutusu, sayaç ve cihaz `plumbing/` tarafında ve hiç kaydedilmiyor.
  Detayda "tesisat planı" göstermek bu yüzden bugün veri olarak mümkün değil.
- **`loadLatestProjectVersion` kaydı olmayan projede `undefined` döner** ve
  react-query `undefined`'ı geçersiz sayıp sorguyu ÇÖZMEZ (bileşen sonsuza kadar
  "yükleniyor" kalır). Bu uç tüketilecekse `?? null` şart.
- **Detayda çizim göstermek gerekirse `scene/` GÖMÜLMEZ.** O bileşenler
  `<Canvas>` içi ve global `cadStore`'a bağlı; detay ekranından o store'u
  doldurmak editörün durumunu dışarıdan yazmak olur. Aynı veriyi okuyan ayrı bir
  çizici yazılmalı (bir kez yazıldı, sekme kapsamdan çıkınca silindi — K55).

## Yetki

Onay/ret/revizyon görünürlüğü TEK yüklemin arkasında: `useCanApproveProject`
(`Admin` + `GasDistributionUser`). Backend ayrı bir yetki alanı açarsa yalnız o
gövde değişir. `usePermission` kullanılmaz (bkz. access-control.md).

Görünürlük ile zamanlama ayrı: yetkisi olmayana aksiyon HİÇ render edilmez
(KK-10), taslak projede görünür ama pasiftir (KK-2).

## Sekmeler ve editöre giriş

BEŞ sekme: Proje Bilgileri, Proje İşlem Geçmişi, Proje Evrakları, Poliçe
Bilgileri, Proje İşlemleri. "Proje Planı", "Katı Model" ve "Gaz Açma" KAPSAM
DIŞI — şeritte pasif madde olarak da durmuyorlar (K50). Aktif sekmenin tek
sahibi URL (`?tab=`), varsayılan adrese yazılmaz.

**Çizim editörüne TEK giriş noktası detay başlığındaki "Çizim Editöründe Aç"
bağlantısı** (`projectEditorPath`, `/projects/:id/editor`). Proje listesindeki
ad artık detaya geliyor. Bu bağlantı yetkiden ve proje durumundan BAĞIMSIZ
olarak her zaman görünür: yeni projenin henüz çizimi yok ve ilk çizim de
buradan yapılıyor — koşullu hâle getirilirse boş proje hiç çizilemez.
