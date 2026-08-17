# decision: mimari ölçüm aracı (jest ortak, hook ayrı)

Tür: `decision` · 2026-08 · İlgili: K80 (docs/kararlar.md).
Tesisat tarafının kendi belgesi ayrı: `measurement-tool.md`.

## Sözleşme (tesisatla AYNI)

Ölçü ÇİZİMİN PARÇASI DEĞİL: `architectureUiStore.measurement`'ta yaşar,
cadStore'a yazılmaz, `markDirty` çağırmaz, geçmişe adım yazmaz, kaydedilen
JSON'a girmez. Model hiç değişmedi.

Jest: 1. tık başlangıç, imleç ikinci noktayı taşır, 2. tık dondurur, Esc siler.
Tamamlanmış ölçümün üstüne tıklamak yenisini başlatır. Esc mimaride aracı
DEĞİŞTİRMEZ (tesisatta `useEscapeToSelectionTool` döndürüyor) — ölçü almak
tekrarlanan bir jest.

## Ne ortak, ne değil

**Ortak (`core/measurement.ts`):** `getMeasurementAnchor`, `getSegmentNormal` —
`plumbing/core/lineGeometry.ts`'ten taşındı, orası yeniden dışa veriyor, tesisat
çağrı yolları değişmedi. `formatLengthMeters` zaten ortaktı (K72).

**Ayrı (bilinçli):** hook + çizim katmanı.

- **Yakalama kuralı farklı ve öyle kalmalı.** Mimari `getPlacementPosition` +
  Ctrl ile anlık kapatma (`useAreaObjectTool`, `usePointDragTool` deseni);
  tesisatınki `placementSnap.ts` üzerinden ızgara GÖRÜNÜRLÜĞÜNE bağlı ve o
  tesisat sahibinin açık kararı (K57). Tek hook o kararı bozardı.
- Durum iki ayrı UI store'unda; ortak hook hangisine yazacağını parametreyle
  sorardı.
- Çizim zaten farklı: tesisat `PipeLine` + `LengthText`, mimari kendi
  `<Line>`/`<Text>` deseni.

Birleştirmek isteyen önce K57'yi (tesisatın yakalama anahtarı) çözmeli.

## Tuzaklar

- İmleç REF'ten okunur, state'ten değil: her pointermove React render'ı
  tetikleseydi ölçüm boyunca tüm sahne yeniden çizilirdi. State yalnız YAZI
  değişince güncellenir.
- Konum `onPointerDown`da yeniden hesaplanır, `onPointerMove`a bırakılmaz —
  dokunmatikte tıklamadan önce hareket olayı gelmez.
- Renk duvar ölçülerinden AYRI (`ARCHITECTURE_COLORS.measurement`): duvar ölçüsü
  kalıcı kotalama, bu geçici okuma — aynı renkte olsalardı ölçüm çizime
  yazılmış sanılırdı.
