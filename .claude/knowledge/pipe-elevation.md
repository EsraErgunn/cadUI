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
bir borunun başlangıç kotu her zaman `elevationCm = 0`'dan başlar — önceki
elemanın oturduğu kot taşınmaz (kapsam dışı, gerekirse sonraki turda eklenir).
