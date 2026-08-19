import { usePlumbingUiStore } from './plumbingUiStore'
import { getFloorIdInDirection, type FloorDirection } from '../../core/floors'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { startChain } from '../core/lineChain'

/**
 * Zincirin ŞU AN çıktığı ucu (`lineId`/`pointId`) mevcut katın TAVANINA (`roomHeightCm`,
 * `Floor.heightCm`) çeker (kullanıcı isteği, 2026-08: "üst kata çıkıyorsa hangi
 * taraftan çıktıysa borunun o tarafına oda yüksekliği kadar yükseklik ver") —
 * yoksa borunun katı terk ettiği uç kullanıcının o ana kadar verdiği rastgele
 * kotta kalır ve görsel olarak tavana değmeden kesilmiş görünür.
 * `pipeElevationActions.ts` → `crossFloorsWithOverflow` OTOMATİK geçişte AYNI
 * kuralı zaten uyguluyordu (`capElevationToFloor`); bu, MANUEL ok-tuşu akışının
 * eksik bıraktığı aynı davranış.
 */
function raiseLineEndToFloorHeight(lineId: Id, pointId: Id, roomHeightCm: number): void {
  const line = useCadStore.getState().installationLines.find((candidate) => candidate.id === lineId)
  if (!line) return

  const isEnd = line.points.at(-1)?.id === pointId
  useCadStore.getState().patchLines([lineId], (candidate) => {
    const pipe = { description: '', startHeightCm: 0, endHeightCm: 0, ...candidate.pipe }
    if (isEnd) pipe.endHeightCm = roomHeightCm
    else pipe.startHeightCm = roomHeightCm
    return { pipe }
  })
}

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

  // Yalnız YUKARI: borunun mevcut katı terk ettiği uç o katın tavanına çekilir
  // (kullanıcı isteği, 2026-08). Aşağı yönde "oda yüksekliği" bu ucun anlamı
  // değil — alt kata inen boru zaten 0'a (o katın tabanı) yaklaşır.
  if (direction === 'up') {
    const currentFloor = cad.floors.find((floor) => floor.id === currentFloorId)
    if (currentFloor) {
      raiseLineEndToFloorHeight(draft.startTarget.lineId, currentPointId, currentFloor.heightCm)
    }
  }

  usePlumbingUiStore.getState().setPendingFloorLink(
    direction === 'up'
      ? { belowFloorId: currentFloorId, aboveFloorId: targetFloorId, belowPointId: currentPointId, position }
      : { belowFloorId: targetFloorId, aboveFloorId: currentFloorId, abovePointId: currentPointId, position },
  )

  useCadStore.getState().setActiveFloor(targetFloorId)
  usePlumbingUiStore.getState().setDraftLine({ kind: 'pipe', ...startChain(position, null, 0) })
  return true
}
