import { usePlumbingUiStore } from './plumbingUiStore'
import { useCadStore } from '../../store/cadStore'
import { advanceChain } from '../core/lineChain'
import { clampPipeHeightCm, findMergeablePipeLineId, PIPE_HEIGHT_STEP_CM } from '../core/lineElevation'

/**
 * Zincirin ucundan AYNI plan konumunda, kotu hedefe değişmiş ikinci bir boru
 * yazar (K98) — normal sol-tık commit'iyle (`addLine`) AYNI yoldan geçer, ayrı
 * bir "kolon yaz" fonksiyonu yok. `useLineTool`'un `+`/`-` tuşu VE
 * `PipeElevationInput`'un sayısal kutusu bu TEK fonksiyonu çağırır — ikisi de
 * "zincirin kotunu değiştir" jestidir, yalnız hedefi hesaplama şekli farklı.
 *
 * Zincirin ucu ZATEN aynı konumdaki bir dikey segmentin bitişindeyse (art
 * arda `+`/`-`) yeni bir boru YAZILMAZ: var olanın `endHeightCm`'i güncellenir
 * (`findMergeablePipeLineId`) — yoksa her basış üst üste binen ayrı bir boru
 * bırakırdı (kullanıcı isteği, 2026-08: "toplansın ve yazsın").
 *
 * Hook DEĞİL: `clipboardActions.ts` ile aynı gerekçe, cadStore (çizim) ile
 * plumbingUiStore (taslak) arasında köprü, React'e ihtiyaç yok.
 */
function commitDraftElevation(targetCm: number): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft || draft.kind !== 'pipe') return false

  const nextElevationCm = clampPipeHeightCm(targetCm)
  if (nextElevationCm === draft.elevationCm) return false

  const mergeableLineId = findMergeablePipeLineId(
    draft.anchor,
    draft.startTarget,
    useCadStore.getState().installationLines,
  )
  if (mergeableLineId !== null) {
    useCadStore.getState().patchLines([mergeableLineId], (line) => ({
      pipe: { description: '', startHeightCm: 0, ...line.pipe, endHeightCm: nextElevationCm },
    }))
    usePlumbingUiStore.getState().setDraftLine({ ...draft, elevationCm: nextElevationCm })
    return true
  }

  const written = useCadStore.getState().addLine({
    kind: draft.kind,
    points: [draft.anchor, draft.anchor],
    pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
    startTarget: draft.startTarget ?? undefined,
    pipe: { startHeightCm: draft.elevationCm, endHeightCm: nextElevationCm, description: '' },
  })
  if (!written) return false

  usePlumbingUiStore
    .getState()
    .setDraftLine({ kind: draft.kind, ...advanceChain(draft, draft.anchor, written, nextElevationCm) })
  return true
}

/** `+`/`-` tuşu: zincirin kotunu bir adım (`PIPE_HEIGHT_STEP_CM`) değiştirir. */
export function commitDraftElevationStep(direction: 1 | -1): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft || draft.kind !== 'pipe') return false

  return commitDraftElevation(draft.elevationCm + direction * PIPE_HEIGHT_STEP_CM)
}

/** Sayısal kutu: zincirin kotunu doğrudan yazılan hedefe taşır. */
export function commitDraftElevationTo(targetCm: number): boolean {
  return commitDraftElevation(targetCm)
}
