import { usePlumbingUiStore } from './plumbingUiStore'
import { getFloorIdInDirection, type FloorDirection } from '../../core/floors'
import { useCadStore } from '../../store/cadStore'
import { startChain } from '../core/lineChain'

/**
 * Zincirin ucunu (`draftLine.anchor`) üst/alt kata bağlar. `addFloorPipeLink.ts`
 * ile aynı gerekçe (`clipboardActions.ts`/`pipeElevationActions.ts`): hook DEĞİL,
 * cadStore (çizim) ile plumbingUiStore (taslak) arasında köprü.
 *
 * Zincirin ucu bir hat noktasına OTURMUYORSA (henüz hiç adım yazılmamış ya da
 * bir porta/ağza bağlıysa) reddedilir — `belowPointId` gerçek bir
 * `InstallationLinePoint` olmalı, port/outlet'in kendi kaydı yok.
 *
 * Hedef katta ilk segment yazılana kadar bağlantı YARIM kalır: `abovePointId`
 * henüz üretilmedi. `pendingFloorLink` bu yarım durumu taşır; `useLineTool.ts`
 * `commitStep` hedef katta ilk adımı yazınca tamamlar (bkz. orada).
 */
export function commitDraftFloorLink(direction: FloorDirection): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft || draft.kind !== 'pipe') return false
  if (draft.startTarget?.kind !== 'linePoint') return false

  const cad = useCadStore.getState()
  let targetFloorId = getFloorIdInDirection(cad.floors, cad.activeFloorId, direction)
  if (targetFloorId === undefined) {
    targetFloorId = useCadStore.getState().addFloor({})
    if (targetFloorId === undefined) return false
  }

  const currentFloorId = cad.activeFloorId
  const currentPointId = draft.startTarget.pointId
  const position = draft.anchor

  usePlumbingUiStore.getState().setPendingFloorLink(
    direction === 'up'
      ? { belowFloorId: currentFloorId, aboveFloorId: targetFloorId, belowPointId: currentPointId, position }
      : { belowFloorId: targetFloorId, aboveFloorId: currentFloorId, abovePointId: currentPointId, position },
  )

  useCadStore.getState().setActiveFloor(targetFloorId)
  usePlumbingUiStore.getState().setDraftLine({ kind: 'pipe', ...startChain(position, null, 0) })
  return true
}
