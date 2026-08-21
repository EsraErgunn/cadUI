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

## Kot kutusu artık FARK istiyor

`commitDraftElevationTo(mutlak)` → `commitDraftElevationBy(fark)`. Yön basılan
tuşta olduğu için mutlak hedef istenseydi tuşun işareti anlamsız kalırdı.
Tavan aşımı / otomatik kat geçişi davranışı DEĞİŞMEDİ (K104).

## `setDraftLine(null)` kutuyu da kapatır

Tek invariant, store'da. Kapanış yollarının hepsi (Esc, sağ tık, hedefe
bağlanarak bitme, araç değişimi, hat düşmesi) ayrı ayrı hatırlamak zorunda
kalmasın diye.
