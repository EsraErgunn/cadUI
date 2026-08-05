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
