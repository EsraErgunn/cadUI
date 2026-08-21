# Klavyeyle boru çizimi (K125–K127)

2026-08. Fareyle çizim duruyor; yanına **sayısal, klavyeyle sürülen** bir yol
eklendi ve bunun için klavyenin kat tuşları BOŞALTILDI.

## Tuş → kip → kutu

Aktif bir `draftLine` varken (yalnız o zaman):

| Tuş | Kip | Kutu ne sorar |
|-----|-----|----------------|
| ← ↑ → ↓ | `length` | O eksende adımın **uzunluğu** (cm) |
| `+` / `-` | `elevation` | **Kot farkı** (cm); yön tuştan gelir |

Tuş boru YAZMAZ, yalnız `plumbingUiStore.draftKeyboardInput` alanını kurar.
Tek kutu iki kipe hizmet eder (`ui/DraftKeyboardInput.tsx`): ayrı iki kutu
olsaydı ikisi aynı anda görünüp odak için yarışırdı. Enter yazar, Esc yalnız
kutuyu kapatır (çizim sürer).

`+` klavye düzenine göre `'+'` ya da `'='` `key`'i üretiyor — `-`/`_` de öyle.
Üçü de kabul edilir (`core/draftKeyboard.ts`), yoksa tuş "çalışmıyor" görünür.

**Ekranda yukarı = plan +Y.** Kamera X'te −90° dönük ortografik tepe kamera
(`scene/Cameras.tsx`), yani three −Z ↔ plan +Y. Tuş ↔ eksen tablosu SADECE
`core/draftKeyboard.ts`'te; testi bu eşlemenin aynalanmasına karşı duruyor.

## Klavyeden kat değiştirme YOK

Kullanıcı kararı (2026-08). Kalkanlar:

- `useEditorShortcuts.ts` → PageUp/PageDown **ve** ok tuşlarıyla komşu kata geçiş,
- `plumbing/store/floorLinkActions.ts` → ok tuşuyla MANUEL `FloorPipeLink`
  kurma (`commitDraftFloorLink`) — dosya SİLİNDİ,
- `plumbingUiStore.pendingFloorLink` ve `useLineTool.commitStep`'teki yarım
  bağlantı tamamlama bloğu.

Kat artık yalnız yüzen çubuğun ▲/▼ düğmelerinden ve kat seçicisinden değişir.
`FloorPipeLink` **hâlâ üretiliyor**: kot aktif katın tavanını aşınca
`pipeElevationActions.crossFloorsWithOverflow` otomatik geçiyor (K104) — kalan
tek üretici o. `FloorLinkGlyph` ve `getFloorLinkAnchoredPointIds` yerinde.

## Adımın TEK yazım yolu

`store/lineStepActions.ts` → `commitDraftStep(point, endTarget)`. Fare
(`useLineTool.commitStep`) ve klavye (`commitDraftAxisLength`) aynı fonksiyondan
geçer; iki çağıran ayrı yazsaydı kot/çap/bağlantı alanlarından biri er geç
birinde unutulurdu. Klavye adımı BİLEREK snap ARAMAZ: yazılan sayı kesindir,
en yakın porta çekilseydi girilen uzunluk tutmazdı.

Branşmanın YER adımı kapsam dışı (`kind === 'branch' && startTarget === null`):
o adım tek boru değil, sayaç + vana yerleştiriyor.

## Z ekseni işareti

`scene/ElevationNodeRing.tsx` — düğümü içine alan, ekran boyunda sabit
(`scale = 1/zoom`) mor halka. İki yerde: yerleşmiş saf dikey segment
(`PipeElevationGlyph`) ve `+`/`-` ile kutusu açılmış taslağın ucu
(`LineDraftPreview`, "yapılacak olan" düğüm). Renk `floorLink` ile AYNI mor
(`ELEVATION_INK`) — ikisi de "burada düşey bir şey oluyor" diyor.

## Gösterge KAYBOLMAZ + köşe-köşe yakalaması (K129)

`PipeElevationGlyph` eskiden yalnız **plan boyu sıfır, iki noktalı** boruda
çiziliyordu. Komşu yatay boru oynatılınca kolonun kaynaklı ucu onunla gidiyor,
iki nokta ayrışıyor ve gösterge kayboluyordu — oysa yükseklik farkı hâlâ
oradaydı. Artık koşul tek: **`firstElevationCm !== lastElevationCm`**. İşaret
hattın SON noktasında durur (yükselinen kot orada; saf dikeyde iki nokta zaten
çakışık olduğu için o durum değişmez).

Kaybolmamak yetmiyordu, kolonun yeniden **düşeyleşebilmesi** de gerekiyordu:
`useSelectionTool.resolveCornerPosition` artık duvardan ÖNCE
`findNearestLineCorner` ile başka bir hat köşesine TAM oturur. Elenenler
sürüklemeyle birlikte giden noktalar (`getLinkedLinePoints`, sürükleme başında
bir kez hesaplanıp `CornerDragTracker.linkedPointIds`'te tutulur) — yoksa köşe
kendi kendine yapışırdı. Segment GÖVDESİ aday değil, yalnız köşeler.

Öncelik neden duvarın önünde: yakın bir duvar yüzü kazansaydı birkaç cm'lik
kayma kalır ve yükseklik bir daha kesinleşmezdi. `useLineTool.resolveSnap`'teki
"bağlantı kurmak konumlandırmadan güçlü bir niyettir" sırasıyla aynı. Ctrl yine
tüm yakalamayı kapatır.

`tryStartCornerDrag`'in "saf dikey borunun KENDİ ucu sürüklenmez" kuralı
DEĞİŞMEDİ — kolon yalnız komşusu üzerinden eğilebiliyor, o da artık geri
oturtulabiliyor.

## Kot kutusu artık FARK istiyor

`commitDraftElevationTo(mutlak)` → `commitDraftElevationBy(fark)`. Yön basılan
tuşta olduğu için mutlak hedef istenseydi tuşun işareti anlamsız kalırdı.
Tavan aşımı / otomatik kat geçişi davranışı DEĞİŞMEDİ (K104).

## `setDraftLine(null)` kutuyu da kapatır

Tek invariant, store'da. Kapanış yollarının hepsi (Esc, sağ tık, hedefe
bağlanarak bitme, araç değişimi, hat düşmesi) ayrı ayrı hatırlamak zorunda
kalmasın diye.
