import { usePlumbingUiStore } from './plumbingUiStore'
import type { PlanPoint } from '../../core/coords'
import { getFloorIdInDirection } from '../../core/floors'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { advanceChain, startChain } from '../core/lineChain'
import { capElevationToFloor, clampPipeHeightCm, findMergeablePipeLineId } from '../core/lineElevation'

/** Proje geneli kat sınırıyla AYNI (`core/floors.ts`) — sonsuz döngüye karşı sağduyu sınırı. */
const MAX_FLOOR_CROSSINGS = 40

/**
 * Zincirin ucundan AYNI plan konumunda, kotu hedefe değişmiş ikinci bir boru
 * yazar (K102) — normal sol-tık commit'iyle (`addLine`) AYNI yoldan geçer, ayrı
 * bir "kolon yaz" fonksiyonu yok. `PipeElevationInput`'un sayısal kutusu bu
 * fonksiyonu çağırır.
 *
 * Zincirin ucu ZATEN aynı konumdaki bir dikey segmentin bitişindeyse yeni bir
 * boru YAZILMAZ: var olanın `endHeightCm`'i güncellenir
 * (`findMergeablePipeLineId`) — yoksa üst üste binen ayrı bir boru bırakırdı
 * (kullanıcı isteği, 2026-08: "toplansın ve yazsın").
 *
 * Hedef kot AKTİF KATIN TAVANINI (`Floor.heightCm`) aşarsa (kullanıcı isteği,
 * 2026-08, bkz. knowledge/pipe-floor-crossing.md): bu katta yazılan kot
 * tavanla sınırlanır (`capElevationToFloor`) ve kalan miktar otomatik olarak
 * bir üst kata `crossFloorsWithOverflow` ile taşınır — K102'nin "otomatik
 * kolon YOK" kararı bilinçli olarak geride bırakıldı.
 *
 * Hook DEĞİL: `clipboardActions.ts` ile aynı gerekçe, cadStore (çizim) ile
 * plumbingUiStore (taslak) arasında köprü, React'e ihtiyaç yok.
 */
function commitDraftElevation(targetCm: number): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft || draft.kind !== 'pipe') return false

  const nextElevationCm = clampPipeHeightCm(targetCm)
  if (nextElevationCm === draft.elevationCm) return false

  const cad = useCadStore.getState()
  const floor = cad.floors.find((candidate) => candidate.id === cad.activeFloorId)
  if (!floor) return false
  const cap = capElevationToFloor(nextElevationCm, floor.heightCm)

  const mergeableLineId = findMergeablePipeLineId(draft.anchor, draft.startTarget, cad.installationLines)
  let belowPointId: Id
  if (mergeableLineId !== null) {
    useCadStore.getState().patchLines([mergeableLineId], (line) => ({
      pipe: { description: '', startHeightCm: 0, ...line.pipe, endHeightCm: cap.endHeightCm },
    }))
    const mergedLine = useCadStore
      .getState()
      .installationLines.find((candidate) => candidate.id === mergeableLineId)
    if (!mergedLine) return false
    belowPointId = mergedLine.points[1].id
    usePlumbingUiStore.getState().setDraftLine({ ...draft, elevationCm: cap.endHeightCm })
  } else {
    const written = useCadStore.getState().addLine({
      kind: draft.kind,
      points: [draft.anchor, draft.anchor],
      pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
      startTarget: draft.startTarget ?? undefined,
      pipe: { startHeightCm: draft.elevationCm, endHeightCm: cap.endHeightCm, description: '' },
    })
    if (!written) return false
    belowPointId = written.endPointId
    usePlumbingUiStore
      .getState()
      .setDraftLine({ kind: draft.kind, ...advanceChain(draft, draft.anchor, written, cap.endHeightCm) })
  }

  if (cap.overflowCm > 0) {
    crossFloorsWithOverflow(draft.anchor, cad.activeFloorId, belowPointId, cap.overflowCm)
  }
  return true
}

/**
 * Kat tavanını aşan kot: sırayla üstteki kat(lar)a `FloorPipeLink` ile
 * otomatik geçilir (kullanıcı isteği, 2026-08). `commitDraftFloorLink`'in
 * (`floorLinkActions.ts`) ok-tuşuyla tetiklenen MANUEL akışıyla AYNI üç
 * primitive'i (`addLine`, `addFloorPipeLink`, gerekirse `addFloor`) kullanır
 * — yalnız kullanıcı bir sonraki tıkı beklemeden, otomatik ve döngülü. Her
 * primitive kendi `set()`+`record()`'unu yaptığı için (K-W) çok katlı bir
 * geçişte birden çok Ctrl+Z adımı oluşması KABUL EDİLEBİLİR — manuel akış da
 * zaten `addLine`/`addFloorPipeLink`'i ayrı adımlar olarak çağırıyordu
 * (`useLineTool.ts` → `commitStep`), burada yeni bir emsal kurulmuyor.
 *
 * Kalan tek katın tavanını da aşarsa (nadir: çok büyük bir kot sıçraması)
 * döngü bir üstteki kata devam eder; proje 40 kat sınırına ulaşılırsa
 * (`addFloor` `undefined` döner) sessizce durur — kalan kısım yazılmadan
 * kalır, hata gösterilmez (dosyadaki diğer sınırların stiliyle aynı, bkz.
 * `clampPipeHeightCm`).
 */
function crossFloorsWithOverflow(
  position: PlanPoint,
  startFloorId: Id,
  startPointId: Id,
  overflowCm: number,
): void {
  let belowFloorId = startFloorId
  let belowPointId = startPointId
  let remainingCm = overflowCm

  for (let step = 0; step < MAX_FLOOR_CROSSINGS && remainingCm > 0; step += 1) {
    let aboveFloorId = getFloorIdInDirection(useCadStore.getState().floors, belowFloorId, 'up')
    if (aboveFloorId === undefined) {
      aboveFloorId = useCadStore.getState().addFloor({})
      if (aboveFloorId === undefined) break
    }
    useCadStore.getState().setActiveFloor(aboveFloorId)

    const aboveFloor = useCadStore.getState().floors.find((candidate) => candidate.id === aboveFloorId)
    if (!aboveFloor) break
    const cap = capElevationToFloor(remainingCm, aboveFloor.heightCm)

    const written = useCadStore.getState().addLine({
      kind: 'pipe',
      points: [position, position],
      pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
      pipe: { startHeightCm: 0, endHeightCm: cap.endHeightCm, description: '' },
    })
    if (!written) break

    useCadStore.getState().addFloorPipeLink({
      belowFloorId,
      aboveFloorId,
      belowPointId,
      abovePointId: written.startPointId,
      position,
    })

    belowFloorId = aboveFloorId
    belowPointId = written.endPointId
    remainingCm = cap.overflowCm

    if (remainingCm <= 0) {
      usePlumbingUiStore.getState().setDraftLine({
        kind: 'pipe',
        ...startChain(
          position,
          { kind: 'linePoint', lineId: written.lineId, pointId: written.endPointId },
          cap.endHeightCm,
        ),
      })
    }
  }
}

/** Sayısal kutu: zincirin kotunu doğrudan yazılan hedefe taşır. */
export function commitDraftElevationTo(targetCm: number): boolean {
  return commitDraftElevation(targetCm)
}
