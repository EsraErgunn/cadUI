# Tesisat seçimi ve taşıma

Tür: `decision` · 2026-08 · İlgili: K26 (docs/kararlar.md), Aşama 4

## Tutma (picking) R3F ışınıyla DEĞİL, saf geometriyle

Plan "seçim R3F'in kendi olay sistemiyle yapılır" diyordu; uygulama
`core/elementPicking.ts` ile saf geometri kullanıyor. Sebep:

- `DrawSurface` tuvalin DOM olayını dinliyor, R3F de **aynı** tuvale kendi
  dinleyicisini kuruyor. Tek `pointerdown` ikisine de düşer; "boş alana tıklayınca
  seçim temizlensin" kuralı iki dinleyicinin KAYIT SIRASINA bağlı kalırdı
  (bkz. [gesture-bus-precedence](./gesture-bus-precedence.md)).
- Tek olay kaynağı = sıradan bağımsız davranış; üstelik tutma sınavı saf fonksiyon
  olarak test edilebiliyor (R3F ışını jsdom'da test edilemez).
- Repodaki diğer araçların hepsi (duvar, açıklık, köşe, yerleştirme) zaten
  `drawSurfaceEvents` üzerinden çalışıyor.

Sınav kutusu sembolün `metadata.bounds`'u — piksel hassasiyetinde SVG geometrisi
değil. Vana/manometre gibi küçük semboller uzaklaşınca tıklanamaz kalmasın diye
zoom'a bağlı tolerans (`getSnapToleranceCm`) eklenir. Üst üste binenlerde dizinin
SONUNCUSU kazanır (en son çizilen = en üstte görünen).

## Çoklu seçim: düz `Id[]`, mimarideki `SelectionItem[]` değil

Tesisatta seçilebilen tek şey eleman; tür alanı taşımak bugün bilgi taşımıyor.
Hat/ölçü de seçilebilir olunca mimarideki ayrık birleşime geçilir — şimdiden
taşınmaz. Yardımcılar `core/elementSelection.ts`'te (toggle / merge / prune).

Çerçeve seçimi **tamamen içeride** kalanı alır, kesişeni almaz — mimarideki
kuralın aynısı (`core/selection.ts`). Sınav elemanın origin'i DEĞİL dört dünya
köşesi: origin çoğu sembolde port hizasında, kenarda duruyor; ona bakılsaydı
çerçevenin yarısı dışında kalan sembol de seçilirdi. Köşeler
`getElementWorldCorners` ile `getPortWorldPosition`'la AYNI dönüşümden geçer (R2)
— ayrışırlarsa çerçeve seçimi tıklama seçiminden başka eleman bulur.

Jest ayrımı: boşluğa basış çerçeve başlatır, elemana basış sürükler. Shift+tık
seçimi değiştirir ve sürükleme BAŞLATMAZ (aynı jestte hem ekleyip hem taşımak
belirsiz). Seçimin içindeki elemana basmak seçimi korur (grup taşınır),
dışındakine basmak seçimi ona indirger.

### Grup sürüklemesi kayma taşır, konum değil

`SymbolInstance` sürüklemede mutlak konum değil **kayma** (`dragDeltaRef`) okur:
seçimdeki her elemana AYNI ref verilir, yoksa seçim büyüdükçe ref sayısı büyürdü.
Izgaraya BASILAN eleman yakalanır ve kayma ondan türetilir — her eleman ayrı ayrı
ızgaraya çekilseydi grup kendi içindeki göreli düzenini kaybederdi.

## Pano: uygulama içi, sistem panosu DEĞİL

Kes/kopyala/yapıştır `store/clipboardActions.ts`'te; pano `plumbingUiStore`'da
(kaydedilmez, geçmişe girmez). Sistem panosuna yazılmıyor çünkü taşınan şey metin
değil eleman kaydı ve serileştirme sözleşmesi (`plumbingSerialize.ts`) henüz yok.

Panoya `id` ve `floorId` KOPYALANMAZ: yapıştırma yeni id üretir (kural 6) ve
AKTİF kata düşer. Pay her yapıştırmada artar (`pasteStepCount`) — sabit pay
olsaydı arka arkaya iki Ctrl+V ikinci kopyayı birincinin tam üstüne koyar,
kullanıcı yapıştırmanın çalışmadığını sanardı.

## Sürükleme tek yazımdır

`pointermove` store'a YAZMAZ; konum `useRef`'te birikir ve yalnız `pointerup`'ta
tek `moveElement` çağrılır → tek `markDirty` → tek Ctrl+Z. Yer değişmediyse
(sadece seçmek için tıklama) hiç yazılmaz, yoksa her tıklama geçmişe boş bir adım
bırakırdı. Izgara adımı yerleştirmeyle aynı fonksiyondan gelir
(`getPlacementPosition`), Ctrl ızgarayı kapatır.

### Tuzak: iptal edilen sürüklemede sembol havada kalır

Sürüklenen elemanın konumu her frame doğrudan `object3D`'ye yazılıyor. Esc ile
iptalde veya yerinde biten sürüklemede `position` propu DEĞİŞMEZ, dolayısıyla R3F
kendiliğinden geri yazmaz ve sembol bırakıldığı yerde asılı kalır. `SymbolInstance`
bu yüzden ref kalkınca konumu elle geri yazan bir effect taşır.

## Vurgu ve portlar sembol grubunun İÇİNDE

`SelectionOutline` ve `PortMarkers` sembol grubunun çocuğu: dönme, ölçek ve
sürükleme dönüşümü onlara grup üzerinden uygulanır, ikinci kez hesaplanmaz ve
`getPortWorldPosition` ile kendiliğinden tutarlı kalır (R2). Grubun ölçeği
çocuklara da geçtiği için işaret boyu ve yükseklik farkı ölçeğe BÖLÜNÜR.

Paylaşılan material'e yazılmaz (R13): vurgu ayrı bir çizgi, port işaretleri
modül düzeyinde tek geometri + tek material.

## Henüz yok

- Dolu/boş port ayrımı: bağlantı verisi Aşama 6'da geliyor, şimdilik hepsi boş halka.
- `hoveredPortId`: tüketicisi Aşama 6'da doğacak, şimdiden store'a konmadı.

## Bırakınca BAĞLANMA (kaynak) — 2026-08

Seçim aracıyla taşıma artık yalnız konum değiştirmiyor, bağ da kuruyor
(kullanıcı isteği: "üst üste gelen borular seçme aracıyla taşıyınca
bağlanabilsin, aynı şekilde vana sayaç vs de").

- **Boru ucu → boru ucu**: `moveLinePoint` taşımadan sonra
  `core/lineWeld.ts` → `collectWeldConnections` ile ÇAKIŞAN uçlara
  `InstallationConnection` yazar. Köşe sürüklemesi zaten en yakın hat köşesine
  tam oturuyordu (`findNearestLineCorner`) ama bu yalnız KONUMDU — kayıt
  olmadığı için ağ kopuk kalıyor, sonraki taşımada ayrılıyordu. Kaynak yalnız
  UÇTAN UCA, taşınan uç boştaysa, aynı katta ve farklı hatlar arasında olur;
  taşınan kümenin kendi noktaları hedef sayılmaz.
- **Eleman → boru ucu**: `useSelectionTool` bırakma jestinde
  `resolveDropAttachment` (core/elementAttach.ts) ile açık bir uç arar ve
  `attachDroppedElement` bağı yazar. Yeni eleman/vana/boru YARATILMAZ: armatür
  (`onLine`) uç düğümüne oturur (`inlineElementId`), sayaç (`lineEnd`) giriş
  portundan bağlanır ve gövdesi portu uca gelecek şekilde döner. Zaten bağlı
  eleman ve çoklu seçim kapsam dışı. Yakıcı cihaz (`nearestLine`) de kapsam
  dışı — onun bağı kısa bir kol borusu yazmayı gerektirir.

## Porta (sayacın gözüne) yapışma — 2026-08

Taşınan boru bir elemanın BOŞ portuna yapışır ve bağlanır (kullanıcı isteği:
"sonradan taşınan boru sayacın gözüne yapışabilsin ve bağlanabilsin"). İki
jestin ikisinde de:

- **Köşe sürüklemesi**: `resolveCornerPosition` artık ÖNCE `findNearestFreePort`
  bakar (port > hat köşesi > duvar köşesi > duvar yüzü) — `useLineTool`'daki
  port önceliğinin aynısı. Bırakınca konum tam portun üstündeyse
  `moveLinePoint`'in yeni `portTarget` parametresiyle bağlantı AYNI adımda
  yazılır.
- **Gövde sürüklemesi**: `resolvePortMagnet` taşınan hatların SERBEST uçlarını
  tarar; biri boş bir porta yaklaşırsa kayma o uca oturacak şekilde düzeltilir
  (ızgara adımı yüzünden yanına düşmesin) ve `moveElements`'in yeni `portWelds`
  parametresiyle bağlantı yazılır. İlk bulunan aday kazanır: tek kaymayla iki
  ayrı port sağlanamaz.

Ctrl ikisinde de mıknatısı kapatır (ızgarayı kapatan jestin aynısı). Dolu port
aday değildir (`findNearestFreePort`), bağlı uç da taranmaz
(`isLineEndConnected`).

**Vananın tek bağlantı noktası MERKEZİDİR** (kullanıcı isteği, 2026-08:
"vananın sadece ortadaki çıkışı olsun, sağ ve soldaki çıkışlar gözükmesin").
Akış geçişli armatürler (vana, selenoid vana, filtre kiti, süzme sayaç) artık
`findNearestFreePort` taramasının DIŞINDA — portları boruyu ayıran bir düğüm,
bağlanılacak hedef değil; zaten işaretleri de çizilmiyordu (`hasPortMarkers`),
yani görünmez bir hedefe yapışılıyordu. Yerine `findNearestInlineArmature` var:
boru armatürün MERKEZİNE yapışır ve armatür o ucun üstüne `inlineElementId`
olarak oturur. Hat ucunun bulduğu hedef `LineEndDropTarget` ile taşınır
(`{kind:'port'}` ya da `{kind:'inline'}`), ikisini de `applyLineEndDropTarget`
yazar. YAN ETKİ: hat çizerken de vananın yan portlarına artık yapışılmıyor —
görünmeyen hedef zaten yapışmamalıydı.
