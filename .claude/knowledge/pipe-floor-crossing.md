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

- ~~Yalnız **YUKARI** yön otomatik~~ — bu sınır K135'te KALKTI, aşağı yön de
  otomatik (bkz. aşağıdaki bölüm).
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

## Gotcha — aşağı yönde sınırda yanlış yönde kat açılıyordu (K106)

`commitDraftFloorLink`'te altta/üstte kat yoksa `useCadStore.getState().addFloor({})`
ile yeni bir kat açılıyordu — ama `addFloor({})` (varsayılan `isBasement: false`)
HER ZAMAN dizinin EN ÜSTÜNE ekler (`appendFloor` → `getFloorInsertIndex`).
`direction === 'down'` iken de aynı çağrı kullanıldığı için, en alt kattayken
aşağı ok tuşuna basmak yeni bir kat AÇIYOR ama onu ÜSTE koyup oraya
geçiriyordu — kullanıcı "aşağı basınca hep üst kata gidiyor, alt kat hiç
açılmıyor" diye fark etti (2026-08). Düzeltme: sınırda `direction === 'down'`
ise `addFloor({ isBasement: true })` çağrılır — bodrum bloğu dizinin BAŞINDA
durduğu için (`floor-ordering.md`) bu, en alttaki katın hemen altına gelir.
Yukarı yönde davranış değişmedi (`addFloor({})` zaten doğru yönde ekliyordu).

## Manuel ok-tuşu akışı da aynı kurala uyar (K105)

Otomatik geçiş `capElevationToFloor` ile terk edilen ucu her zaman katın
tavanına (`Floor.heightCm`) çekiyordu; MANUEL akış (`floorLinkActions.ts` →
`commitDraftFloorLink`, ok tuşuyla tetiklenen) bunu YAPMIYORDU — kullanıcı
hangi kotta ok tuşuna basmışsa boru o kotta kesik kalıyordu. Kullanıcı isteği
(2026-08): "üst kata çıkıyorsa hangi taraftan çıktıysa borunun o tarafına oda
yüksekliği kadar yükseklik ver". `commitDraftFloorLink` artık yalnız
**yukarı** yönde, taslağın `startTarget`'ının oturduğu (ÇIKILAN) hattın ucunu
`raiseLineEndToFloorHeight` ile mevcut katın tavanına çekiyor — hangi ucun
(`start`/`end`) yükseltileceği `line.points.at(-1)?.id === pointId` ile
belirlenir. **Aşağı** yönde dokunulmaz (istek metni yalnız yukarıyı kapsıyor;
aşağı inen boru zaten 0'a, o katın tabanına yaklaşır). Yeni kattaki taslak
hâlâ SIFIR kottan başlar (`startChain(position, null, 0)`) — yalnız terk
edilen taraf yükselir, giren taraf değil.

## Sahne ipucu KALDIRILDI (2026-08)

`FloorLinkPrompt.tsx`, zincirin ucunda HER borunun her adımında "↑ Üst Kata
Bağla / ↓ Alt Kata Bağla" yazan bir metin ipucuydu — kendisi de 2026-08'de
kullanıcı isteğiyle eklenmişti ("HER ZAMAN görünen ipucu"). Kullanıcı sonradan
bunun her çizimde gereksiz gürültü olduğunu söyledi; dosya silindi,
`DrawPreview.tsx`'teki render'ı kaldırıldı. **Fonksiyonellik etkilenmedi**:
gerçek tetikleyici hep ok tuşlarıydı (`useLineTool.ts` → `handleKeyDown`),
etiket yalnızca hatırlatıyordu. Kalıcı rozet (`FloorLinkGlyph.tsx` →
`FloorLinkGlyphs`, zaten kurulmuş bir `FloorPipeLink`in üstündeki ▲/▼ işareti)
AYRI bir bileşen ve DOKUNULMADI — o "burada bir kat bağlantısı var" bilgisini
taşıyor, "bağlayabilirsin" ipucunu değil.

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

## Aşağı yön de otomatik (K135)

K104'ün "yalnız yukarı" sınırı kullanıcı bulgusuyla kalktı (2026-08: "boruya
`-` yükseklik girince oda uzunluğundan fazlaysa alt kata inmeli ama inmiyor").

Yukarıdaki çiftin aynası:

| yukarı | aşağı |
|---|---|
| `capElevationToFloor(target, floorHeightCm)` → `overflowCm` | `capElevationToFloorBase(target)` → `underflowCm` |
| `crossFloorsWithOverflow` | `crossFloorsDownWithUnderflow` |
| sınırda `addFloor({})` | sınırda `addFloor({ isBasement: true })` (K106) |
| yeni kata TABANINDAN (0) girilir | yeni kata TAVANINDAN (`Floor.heightCm`) girilir |

Son satır aynanın TEK asimetrisi ve kolay atlanır: üst katın tabanı alttakinin
tavanıdır, bu yüzden aşağı inen borunun `startHeightCm`i sıfır DEĞİL alt katın
yüksekliğidir ve kot aşağı doğru tüketilir.

Tabanın eşiği neden parametre değil: tavan kata göre değişir (`Floor.heightCm`),
taban değişmez — her katın tabanı kendi yerel koordinatında sıfırdır (kot
saklanmaz, `core/floorElevation.ts` türetir).

Tek bir hedef kot ya tavanı aşar ya tabanı deler; `commitDraftElevation` bu
yüzden iki taşmayı `else if` ile ayırır. Diğer kapsam sınırları (yalnız çizim
sırasında, yalnız `pipe` türü) DURUYOR.
