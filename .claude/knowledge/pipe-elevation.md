# Boru kotu (Z ekseni)

**Tür:** decision · **Tarih:** 2026-08 · **İlgili:** K102

## Neden ayrı `riser` kind YOK

İlk denemede dikey boru ayrı bir hat türüydü (`kind: 'riser'`, plan boyu
SIFIR) — sekiz ayrı yerde NaN/özel-durum koruması, kendi kat-geçiş menüsü,
ayrı bir zincir yazımı, pano/kat-kopyalama istisnaları gerektiriyordu.
Kullanıcı bunu geri aldırdı ("temizinden ekle").

Gerçek çözüm: `InstallationLine.pipe.startHeightCm`/`endHeightCm` ZATEN
vardı (`lineProperties.ts`) ama salt açıklayıcıydı, hiçbir geometri/render
kodu okumuyordu. Çizim kuralı gereği ("K-W: her sol tık kendi borusunu
yazar") tipik bir hat 2 noktalıdır — start/end height kullanıcının "her
noktada yükseklik" isteğinin karşılığıdır. Yeni model alanı ya da ayrı tür
GEREKMEDİ, var olan alanlar render'a bağlandı (`core/lineElevation.ts`).

## Sıfır-plan-boylu segment (saf dikey bağlantı)

Aynı plan konumunda iki nokta, farklı kot — hâlâ mümkün ve gerekli (düz
yukarı/aşağı bağlantı). Riski YALNIZ iki dosyada, "riser" adı olmadan, genel
"sıfır uzunluklu segment" koruması olarak ele alınıyor:

- `core/attachGeometry.ts` → `findNearestSegment`/`findNearestFreeLineEnd`:
  çakışık iki nokta aday değil (`getUnitDirection` sıfıra böler → NaN).
- `core/lineSimplify.ts` → `isCollinear`: komşu segmentlerden biri sıfır
  uzunluktaysa köşe SİLİNMEZ (yoksa kasıtlı dikey bağlantı "düz doğru"
  sanılıp süpürülür).

⚠️ **Güncelleme (aynı gün, üçüncü tur):** "köşe sürüklemesi için özel bir
istisna yok" kararı kullanıcı isteğiyle GERİ ALINDI. Dikey (plan boyu sıfır)
bir segmentin köşesi artık `useSelectionTool.tryStartCornerDrag`'de fareyle
SÜRÜKLENEMEZ — "görünüm olarak sabit kalsın" isteği. Kot/boy yalnız panelden
ya da `PipeElevationInput`'tan sayıyla değişir. Guard `riser` adı olmadan,
genel "sıfır uzunluklu segment" kontrolüyle (`isSamePoint`).

## `+`/`-` — ayrı bir "kolon yaz" fonksiyonu YOK

`useLineTool.commitElevationStep`, normal sol-tık commit'iyle (`addLine`)
AYNI yolu kullanır: `points: [anchor, anchor]`, `pipe.endHeightCm` bir adım
(`PIPE_HEIGHT_STEP_CM = 25`) değişmiş. Zincir `LineChain.elevationCm`'i
taşır (`core/lineChain.ts`); yatay adımda değişmez, dikey adımda
`advanceChain`'e yeni değer geçirilir. Kat geçişi bu değeri KENDİLİĞİNDEN
DEĞİŞTİRMEZ — kullanıcı isteği, otomatik kolon veya özel bir kat menüsü bu
turda YOK.

## Görsel — `PipeElevationGlyph.tsx`

Ortografik PLAN görünümü tepeden bakar: sıfır-plan-boylu bir segment TEK
NOKTA gibi görünür, çizgi görünmez. `PipeElevationGlyph` o noktada kompakt
bir etiket bırakır (`▲0,75 m` / `▼0,50 m`, `LengthLabels.tsx`'teki
`LengthText`'i kullanır). `LengthLabels.tsx`'teki normal "X,XX m" etiketi bu
segmentte YAZILMAZ (yanıltıcı "0,00 m" olurdu).

Devam eden çizimin o anki kotu (`chain.elevationCm`) sıfır değilse
`DrawPreview.tsx` → `LineDraftPreview` anchor'ın yanında "Kot: X,XX m" yazar.

## Elemanların kotu — boruyu izler

`core/lineElevation.ts` → `getInlineElementElevationCm(elementId, lines)`:
elemanın `inlineElementId` ile oturduğu hat noktasını bulur, o noktanın
kümülatif plan-offsetini hesaplar, `getElevationAtOffsetCm` ile kotu türetir.
Yalnız `pipe` türü hatlarda anlamlı; serbest/`free` elemanlar ve
chimney/duct/branch üstünde oturanlar `0` alır.

`PlumbingLayer.tsx` → `InstallationElements` bunu HER RENDER'DA türetir,
store'a YAZMAZ (kural 4) — `SymbolInstance`'a yeni bir `elevationCm` prop'u
olarak geçer.

⚠️ **Bilinen sınır:** `onLine` SÜRÜKLEME (kaydırma) sırasındaki canlı
önizleme bu türetilmiş değeri OKUMAZ — sürükleme ayrı bir kanaldan
(`plumbingUiStore` sürükleme durumu) geliyor. Sürükleme boyunca eleman eski
kotunda görünür, bırakılınca (commit) doğru kota "zıplar". Kapsam dışı
bırakıldı (2026-08 tur kararı) — canlı senkron gerekirse `resolveOnLineSlide`
dönüşüne `elevationCm` eklenir.

## Metraj — gerçek 3B boru boyu

`getLine3dLengthCm(points, startHeightCm, endHeightCm)`: her segment için
`sqrt(planCm² + kotFarkıCm²)` toplanır. `PipePropertiesPanel`'deki salt
okunur "Boy (cm)" alanı artık BUNU gösterir, eski 2B `getLineLengthCm`
değil — metraj/malzeme dökümü gerçeği yansıtır.

## Sayısal kot girişi ve düzenlenebilir "Boy"

- Çizerken kotu SAYIYLA girmek `+`/`-` adımından ayrı bir yol:
  `plumbing/ui/PipeElevationInput.tsx` (yalnız aktif `pipe` taslağı varken
  görünür) → `store/pipeElevationActions.ts`. Bu dosya `useLineTool.ts`'in
  `+`/`-` tuşuyla da PAYLAŞILAN TEK commit fonksiyonunu tutar
  (`commitDraftElevation`) — ikisi de "zincirin kotunu değiştir" jesti,
  yalnız hedefi hesaplama şekli farklı (adım vs. mutlak değer). Hook DEĞİL,
  `clipboardActions.ts` ile aynı desen (cadStore ↔ plumbingUiStore köprüsü).
- Zincir DEVAM ederken sonraki segmentler zaten o kottan başlıyor
  (`LineChain.elevationCm` taşınıyor) — ayrıca bir şey gerekmedi.
- `PipePropertiesPanel`'deki "Boy (cm)" artık DÜZENLENEBİLİR — ama yalnız
  TEK ve İKİ NOKTALI hatta (`resolvePipeResizeTarget`, `lineElevation.ts`):
  segmentin GÜNCEL 3B yönü korunarak ölçeklenir (saf yatayda yalnız plan
  uzar, saf dikeyde K102 yalnız kot değişir, eğikte ikisi orantılı). Üç+
  noktalı (armatür oturmuş) ya da çoklu seçimde salt okunur kalır —
  `WallProperties.tsx`'teki "uzunluk komşu köşeyi de sürükler" gerekçesiyle
  aynı: hangi ucun hangi yöne kayacağı belirsizleşir.
- Taşıma + kot TEK adımda: `plumbingSlice.resizePipeEnd` `moveLinePoint`'in
  bağlı-nokta mantığını (`getLinkedLinePoints`, port-anchor reddi) kopyalar
  AMA `pipe.endHeightCm`'i de AYNI `set()`/`record()` içinde yazar — ayrı
  çağrılsaydı bir kullanıcı eylemi iki Ctrl+Z adımı açardı.

## Art arda `+`/`-` ÜST ÜSTE BİNMEZ, TOPLANIR

Zincirin ucu zaten aynı konumdaki bir dikey segmentin bitişindeyse
(`findMergeablePipeLineId`, `lineElevation.ts`) ikinci `+`/`-` basışı YENİ bir
boru YAZMAZ — var olanın `pipe.endHeightCm`'i güncellenir. Aksi hâlde her
basış aynı noktada üst üste binen ayrı bir boru bırakırdı (kullanıcı isteği,
2026-08: "toplansın ve yazsın"). Eşleşme yalnız zincirin `startTarget`'ı o
hattın UCUNA (`linePoint`) bağlıyken geçerli — araya yatay bir adım girdiyse
artık başka bir noktadayız, yeni boru yazılır (beklenen).

## Portlar bilerek 2D kalır

`core/ports.ts` → `getPortWorldPosition` kot TAŞIMAZ. Port bir plan bağlantı
noktası tanımlar; kot yalnız render/attach katmanında (yukarıdaki
`getInlineElementElevationCm`) ayrıca hesaplanır. Zincir devam ederken yeni
bir borunun başlangıç kotu genelde `elevationCm = 0`'dan başlar — önceki
elemanın oturduğu kot taşınmaz (kapsam dışı, gerekirse sonraki turda eklenir).
İKİ İSTİSNA aşağıda.

## Servis kutusu ve branşman varsayılan kotu (kullanıcı isteği, 2026-08)

`elevationCm = 0` yerine iki AYRI sabit kullanılır (`core/lineElevation.ts`):

1. `SERVICE_BOX_SEED_HEIGHT_CM = 15`: servis kutusunu KENDİLİĞİNDEN
   yerleştiren ilk boru (`useLineTool.ts` → `startDraft`,
   `getLineSeedElementType`) bu kotta başlar — kutu zemine yakın çıkar, 0
   değil ama sayaç kotuyla (200) da AYNI değildir.
2. `BRANCH_SEED_HEIGHT_CM = GAS_METER_DEFAULT_HEIGHT_CM` (=200): branşman
   aracı sayacı yerleştirdikten SONRA devam eden boru (`useLineTool.ts` →
   `commitBranchGroundStep`, sayacın çıkış portundan) sayaçla AYNI kotta
   başlar — sıfırdan başlayıp sayaçta zıplamaz.

Aynı kot MAVİ KESİKLİ KOLA (`branchStub`, yer noktasından sayacın giriş
portuna) da yazılır — `commitBranchGroundStep`'in `addLine` çağrısı artık
`pipe: {startHeightCm/endHeightCm: BRANCH_SEED_HEIGHT_CM}` geçiyor. Kolun
UCUNA oturan sayaç da aynı kotu alır: `plumbingSlice.placeElementAtLineEnd`
eskiden yalnız `line.kind === 'pipe'`de kot yazıyordu, `branchStub` de artık
dahil (bu eylem zaten YALNIZ sayaç için kullanılıyor, `attachModes.ts`) —
yoksa branşman aracıyla eklenen sayaç 0 kotta kalıyordu, paletten var olan
bir `pipe` hattına sürüklenen sayaç 200 alıyordu; iki yol farklı davranıyordu.

⚠️ **Yazma yetmiyor, OKUMA da genişlemeli:** `branchStub`'a `pipe` yazmak tek
başına yeterSİZDİ — `getInlineElementElevationCm` (armatürün/sayacın kotu) ve
`getElementInputElevationCm` (elemanın giriş hattının kotu) `line.kind ===
'pipe'` koşuluyla GATE'liydi, `branchStub` üstündeki veriyi görmezden gelip
`0` dönüyordu (panel/render "kot eklenmemiş gibi" davranıyordu — kullanıcının
"branşmanın defaultu 200 değil" bulgusu buradan). İkisi de artık ortak
`hasTwoEndedPipeElevation(line)` (`pipe` VEYA `branchStub`, `line.pipe`
dolu) üzerinden okuyor — yeni bir "kind listesi" YAZILDIĞI her yerde
tekrarlanmasın diye TEK yardımcı.

## Hedefe bağlı YENİ boru, hedefin O ANKİ kotunu devralır

`resolveSeedElevationCm(target, elements, lines, connections)`: `pipe` aracı
BOŞ YERE değil bir HEDEFE (`snap`) bağlı başlarken (`useLineTool.ts` →
`startDraft`) artık `elevationCm = 0` değil bu fonksiyonun döndürdüğü değerle
başlar (kullanıcı isteği, 2026-08):

- Hedef bir **servis kutusu** portuysa → `SERVICE_BOX_SEED_HEIGHT_CM` (kutu
  kendi kotunu TAŞIMAZ, sabit varsayılan).
- Hedef bir **sayaç** portuysa → o sayaca ZATEN bağlı bir hat varsa onun
  kotu (`getElementInputElevationCm`, kullanıcı sonradan değiştirmiş
  olabilir — GÜNCEL değer okunur), hiç hat yoksa `GAS_METER_DEFAULT_HEIGHT_CM`.
- Hedef mevcut bir **hattın köşesi/segmenti**yse (`linePoint`/`lineSplit`) →
  `pipe`/`branchStub` ORANLA (`getElevationAtOffsetCm`, o noktadaki
  enterpolasyon), `branch` DÜZ tek değerle (`branch.elevationCm`).
- Hedef bir **deşarj ağzı** (`outlet`, baca/havalandırma) ise → `0`, gaz
  taşımaz.

Yalnız `pipe` aracı bu yoldan geçer — `branch` aracı zaten hiç `snap`
ARAMAZ (kendi ground-free-point akışı, `commitBranchGroundStep`, sabit
`BRANCH_SEED_HEIGHT_CM` kullanır).

## Elemanın KENDİSİ de kotu izlemeli — yalnız borusu değil

⚠️ **Bulunan ikinci boşluk (kullanıcı bulgusu, 2026-08):** yukarıdaki hepsi
BORUNUN veri modelini doğru dolduruyordu ama SAHNEDE (3B) yalnız `onLine`
armatürler (`getInlineElementElevationCm`) o kotu görsel olarak izliyordu —
servis kutusu (`free`) ve sayaç (`lineEnd`) `PlumbingLayer.tsx` →
`InstallationElements`'te HER ZAMAN `elevationCm=0` alıyordu: kutunun çıkış
borusu 15cm'e, sayacın giriş borusu 200cm'e yükselse bile elemanın kendi
sembolü zeminde çiziliyordu. "Z ekseninde kullandığımız her şey için
geçerli" (kullanıcı) — yani tutunma biçiminden (onLine/lineEnd/nearestLine/
free) bağımsız TEK bir kot kaynağı gerekiyordu.

Çözüm: `getElementElevationCm(elementId, lines, connections)`
(`core/lineElevation.ts`) — `PlumbingLayer.tsx`'teki eski
`getInlineElementElevationCm` çağrısının YERİNE geçti (ikisi de dışa açık
kalıyor, ikincisi hâlâ inline-özel testlerde/başka yerlerde kullanılabilir).
Sıra: ÖNCE `inlineElementId` (armatür bir boru DÜĞÜMÜdür, mevcut davranış
korunur), yoksa elemana bağlı HERHANGİ bir port bağlantısı — o hattın
UCUNDAKİ (`start`/`end`, hangi ucunda bağlıysa) kotu alır. İkisi de yoksa
(henüz hiçbir şeye bağlanmamış tamamen serbest eleman) `0`.

⚠️ Bu, yakıcı cihazları (`nearestLine`, kısa kolla bağlı) da kapsar — cihazın
kolu kesikli KIRMIZI (`applianceStub`) çizilir ama `applianceStub`
`hasTwoEndedPipeElevation`'a GİRMEZ (yalnız `pipe`/`branchStub`), yani cihaz
bugün hâlâ `0`'da kalır; bu turda yalnız servis kutusu + sayaç bulgusu
giderildi, cihaz kolu ayrı bir karar gerektirirse (`applianceStub`'a da kot
eklensin mi) sonraki tura bırakıldı.

Branşman kendisi (`branchStub` + sayaç öncesi kol) hâlâ kot TAŞIMAZ (yalnız
`pipe` türü iki uçlu kot alır, K102) — ama sayaç SONRASI devam eden boru artık
`kind: 'branch'` olsa da `InstallationLine.branch.elevationCm` alanına
`draft.elevationCm` yazılıyor (`commitStep`, `plumbingSlice.pushLine`/`addLine`
`branch` alanını artık kabul ediyor) — önceden bu alan YALNIZ property
panelinden elle dolduruluyordu, çizim sırasında hiç yazılmıyordu.
