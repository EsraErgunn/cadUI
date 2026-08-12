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
`extras` üretim derlemesinde `null` — `mockGate.ts` sahte veriyi yalnız
`import.meta.env.DEV` altında üretir. Bu iki parçayı düz bir nesnede
birleştirirsen mock işareti (`MockValue`) konulamaz hâle gelir ve K51 bozulur.

**Uç bayrakları `unimplementedEndpoints.ts`'te ve mekanizma sınandı:** bir
anahtar silinince çağıran dosya TS2345 verir (ölçüldü). Tek boşluk, hiç çağrısı
olmayan bayraktır — yeni bayrak eklerken en az bir `isEndpointImplemented('…')`
çağrısı yazılmalı, yoksa bayrak sessiz kalır.

## Sık düşülecek tuzaklar

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
  Plan görüntüleyicisi bu yüzden mimari katmanı çiziyor ve bunu ekranda
  söylüyor — "tesisat planı" beklentisiyle koda bakan biri buraya düşer.
- **`loadLatestProjectVersion` kaydı olmayan projede `undefined` döner** ve
  react-query `undefined`'ı geçersiz sayıp sorguyu ÇÖZMEZ (sekme sonsuza kadar
  "yükleniyor" kalır). `?? null` ile çevrilmeli.
- **`document.fullscreenElement` Fullscreen API'si olmayan ortamda `undefined`**;
  `!== null` kontrolü "zaten tam ekrandayız" sanır. Doğruluk kontrolü kullan.
- **Plan `scene/`'i kullanmaz.** Aynı veriyi okuyan bağımsız bir SVG çizici
  (`planGeometry.ts`). `scene/` bileşenleri global `cadStore`'a bağlı; detay
  ekranından o store'u doldurmak editörün durumunu dışarıdan yazmak olurdu.

## Yetki

Onay/ret/revizyon görünürlüğü TEK yüklemin arkasında: `useCanApproveProject`
(`Admin` + `GasDistributionUser`). Backend ayrı bir yetki alanı açarsa yalnız o
gövde değişir. `usePermission` kullanılmaz (bkz. access-control.md).

Görünürlük ile zamanlama ayrı: yetkisi olmayana aksiyon HİÇ render edilmez
(KK-10), taslak projede görünür ama pasiftir (KK-2).

## Sekmeler

İçeriği olan altı sekme + şeritte pasif duran "Katı Model" ve "Gaz Açma"
(`aria-disabled` + "Yakında"). `disabled` kullanılmaz: odaklanamayan madde
klavye ve ekran okuyucu kullanıcısına hiç görünmez. Aktif sekmenin tek sahibi
URL (`?tab=`), varsayılan adrese yazılmaz.
