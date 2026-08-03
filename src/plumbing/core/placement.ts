import type { PlanPoint } from '../../core/coords'
import { pickGridLevel, snapPointToGrid } from '../../core/grid'

export const DEFAULT_ELEMENT_ANGLE_DEG = 0
/** 1 = metadata'daki doğal boy; sembol başına hard-coded ölçek yok. */
export const DEFAULT_ELEMENT_SCALE = 1

/**
 * Bırakma noktası aktif zoom'un İNCE ızgara adımına oturur — kullanıcı ızgarada
 * gördüğü çizgiye bırakır, kademe değişince snap adımı da onunla değişir.
 */
export function getPlacementPosition(planPoint: PlanPoint, zoom: number): PlanPoint {
  return snapPointToGrid(planPoint, pickGridLevel(zoom).minorCm)
}
