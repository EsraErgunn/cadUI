import type { PlanPoint } from '../core/coords'
import { pickGridLevel } from '../core/grid'
import type { Id } from '../core/model'
import {
  constrainDeltaToNormal,
  snapFreeMoveToGrid,
  snapNormalMoveToGrid,
} from '../core/wallMove'
import { findWallMoveBlocker } from '../core/wallMoveValidity'
import { useCadStore } from '../store/cadStore'

export type WallDragInput = {
  wallIds: Id[]
  /** Tutulan duvarın p1'i; ızgara yapışması bu köşe üzerinden yapılır. */
  originP1: PlanPoint
  /** Tek duvar sürüklenirken hareketin kilitlendiği normal; çoklu seçimde yok. */
  normal: PlanPoint | undefined
  /** Basış anından bu yana ham imleç farkı. */
  rawDxCm: number
  rawDyCm: number
  zoom: number
  /** Ctrl ızgarayı kapatır — usePointDragTool ile aynı jest. */
  isGridDisabled: boolean
}

/**
 * Sürüklemenin store'a yazılacak ötelemesi. Geçersiz konumda `undefined` döner
 * ve çağıran ÖNCEKİ değeri korur: duvar son geçerli yerinde durur, fiziksel bir
 * engele dayanmış gibi.
 *
 * Önceden imleci geçersiz konuma kadar izliyor, kopmuş hâli gösteriyor ve
 * bırakışta geri atıyordu — kullanıcı çizimin yırtıldığını sanıyor ve duvarı
 * hiçbir yere bırakamıyordu (K103).
 */
export function resolveWallDragDelta(
  input: WallDragInput,
): { dxCm: number; dyCm: number } | undefined {
  const stepCm = input.isGridDisabled ? 0 : pickGridLevel(input.zoom).minorCm

  if (!input.normal) {
    return snapFreeMoveToGrid(input.originP1, input.rawDxCm, input.rawDyCm, stepCm)
  }

  const constrained = constrainDeltaToNormal(input.rawDxCm, input.rawDyCm, input.normal)
  const moved = snapNormalMoveToGrid(
    input.originP1,
    constrained.dxCm,
    constrained.dyCm,
    input.normal,
    stepCm,
  )

  const cad = useCadStore.getState()
  const blocked = findWallMoveBlocker(
    cad.walls,
    cad.points,
    input.wallIds[0],
    moved.dxCm,
    moved.dyCm,
    cad.activeFloorId,
  )

  return blocked ? undefined : moved
}
