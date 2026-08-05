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
