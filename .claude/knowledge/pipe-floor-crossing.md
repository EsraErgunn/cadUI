# Boru kotu kat tavanını aşınca otomatik kat geçişi + bağlı uç kilidi

**Tür:** decision · **Tarih:** 2026-08 · **İlgili:** [pipe-elevation](./pipe-elevation.md) K102, [floor-ordering](./floor-ordering.md)

Kullanıcı isteği: "Boru hatlarını kattan kata çıkartırken katlar arasında
bağlı borular hareket ettirilemesin. Boruya katın uzunluğundan fazla kot
verilirse yeni kata çıksın. Üstüne hâlâ kot varsa o kadar daha yeni katta kot
verilsin."

Bu, K102'nin "otomatik kolon ya da özel bir kat menüsü bu turda YOK" notunu
BİLİNÇLİ olarak geride bırakır — o turda kullanıcı bunu istemiyordu, bu turda
istedi.

## Otomatik kat geçişi

`+`/`-` tuşu ve kot kutusu (`PipeElevationInput`) TEK fonksiyondan geçiyordu
(`commitDraftElevation`, `pipeElevationActions.ts`, K102) — bu fonksiyon artık
hedef kotu aktif katın tavanıyla (`Floor.heightCm`) karşılaştırıyor
(`capElevationToFloor`, `core/lineElevation.ts`, saf+testli):

- Tavanın altındaysa davranış AYNI (tek segment, kat değişmez).
- Tavanı aşarsa: bu katta yazılan kot tavanla sınırlanır, kalan miktar
  `crossFloorsWithOverflow` ile bir üst kata TAŞINIR — var olan MANUEL
  `FloorPipeLink` mekanizmasıyla (`floorLinkActions.ts` → `commitDraftFloorLink`,
  ok tuşuyla tetiklenen akış) AYNI üç primitive (`addLine`, `addFloorPipeLink`,
  gerekirse `addFloor`), yalnız kullanıcı beklemeden OTOMATİK ve DÖNGÜLÜ.
- Kalan miktar YENİ kattaki tavanı da aşarsa döngü bir üst kata daha devam
  eder (ardışık `FloorPipeLink`'ler) — `MAX_FLOOR_CROSSINGS` (=40, proje
  geneli kat sınırıyla aynı, `core/floors.ts`) sağduyu sınırı.
- Üstte kat yoksa `addFloor({})` ile otomatik açılır (varsayılan yükseklik).
  Proje 40 kat sınırına ulaşılırsa (`addFloor` `undefined` döner) döngü
  SESSİZCE durur — kalan kısım yazılmadan kalır, hata gösterilmez
  (`clampPipeHeightCm`'in sessiz kelepçeleme stiliyle aynı).

**Bilinçli kapsam sınırları:**

- Yalnız **YUKARI** yön otomatik — kot 0'ın altına inip alt kata otomatik
  geçme YOK (istek metni yalnız "yeni kata çıksın" diyor).
- Yalnız **ÇİZİM SIRASINDA** (`commitDraftElevation`) — zaten yerleşmiş bir
  boruyu `PipePropertiesPanel`'in "Boy" alanından (`resizePipeEnd`) büyütmek
  bu otomasyonu TETİKLEMEZ, o yol hâlâ salt geometrik ölçekleme yapıyor
  (bkz. pipe-elevation.md "Sayısal kot girişi ve düzenlenebilir Boy").
- Yalnız `pipe` türü — `branch` (`branch.elevationCm`, tek alan) kapsam dışı,
  K102'de zaten ayrı tutuluyordu.

**Çok katlı geçişte birden çok Ctrl+Z adımı oluşması KABUL EDİLEBİLİR**: her
primitive (`addLine`/`addFloorPipeLink`/`addFloor`) kendi `set()`+`record()`'unu
yapıyor (K-W deseni) — manuel akış (`commitDraftFloorLink` → sonraki
`commitStep`) da zaten `addLine`/`addFloorPipeLink`'i ayrı adımlar olarak
çağırıyordu. Ayrıca `addFloor` MİMARİ geçmişte (`floors` dizisi izleniyor),
`addLine`/`addFloorPipeLink` TESİSAT geçmişinde (K44 "ayrı geçmiş") — floor
oluşturma gerektiren bir geçiş zaten iki farklı Ctrl+Z yığınına dokunuyor,
burada yeni bir emsal kurulmadı.

## Kilit — floor-link uçları taşınamaz

`FloorPipeLink.belowPointId`/`abovePointId` artık port-çapa deseninin
(`getPortAnchoredPointIds`) aynısıyla korunuyor —
`getFloorLinkAnchoredPointIds` (`core/lineCornerLink.ts`, saf+testli, ID'ler
proje geneli benzersiz olduğu için kata göre filtrelemeye GEREK YOK).
Bağlandığı dört yer:

- `plumbingSlice.ts` → `moveLinePoint`/`resizePipeEnd` (port çapasıyla
  BİRLEŞTİRİLDİ: `anchored.has(x) || floorLinkAnchored.has(x)`).
- `useSelectionTool.ts` → `tryStartCornerDrag` (sahne katmanı, aynı birleşim).
- `moveTargets.ts` → `resolveMoveTargets`: yeni `floorPipeLinks` parametresi.
  Port çapasından FARKLI olarak, "Seçili hat BÜTÜNÜYLE kayar" döngüsünde AYRICA
  elenmesi gerekti — port çapasının orada zararsız olma sebebi
  (`expandMoveSelection`'ın port sahibi elemanı seçime otomatik katması) floor-link
  için GEÇERLİ DEĞİL: diğer taraf başka bir kattaki hat, aktif seçime giremez.

Not: Sıfır-plan-boylu (dikey) segmentlerin köşesi zaten K102 gereği hiç
sürüklenemiyordu (`useSelectionTool.ts`, "dikey bağlantı" guard'ı) — yeni
otomatik kat-geçiş segmentleri de sıfır-plan-boylu olduğu için bu koruma
onlara da otomatik uygulanıyor. Asıl kapatılan açık, ZİNCİRLE o uca bağlı
KOMŞU bir köşeyi (`getLinkedLinePoints` yayılımı) sürüklemeye çalışmaktı.

**Dosya:** `plumbing/core/lineElevation.ts` (`capElevationToFloor`) ·
`plumbing/core/lineCornerLink.ts` (`getFloorLinkAnchoredPointIds`) ·
`plumbing/core/moveTargets.ts` · `plumbing/store/pipeElevationActions.ts`
(`crossFloorsWithOverflow`) · `plumbing/store/plumbingSlice.ts` ·
`plumbing/scene/useSelectionTool.ts`
