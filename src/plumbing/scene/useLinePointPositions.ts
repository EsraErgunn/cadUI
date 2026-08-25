import { useMemo } from 'react'

import type { DraggedCorner } from './useDraggedCorners'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import type { InstallationLine } from '../core/installationModel'

/**
 * Hattın köşeleri, sürüklenen köşe geçici konumuyla yerine konmuş hâlde.
 * `useDraggedLinePoints` ile aynı gerekçe: köşe bırakılana kadar cadStore
 * yazılmaz, etiket yine de canlı uzunluğu göstermeli.
 */
export function useLinePointPositions(
  line: InstallationLine,
  corner: DraggedCorner | undefined,
): ReadonlyMap<Id, PlanPoint> {
  return useMemo(() => {
    const positions = new Map<Id, PlanPoint>()
    for (const point of line.points) {
      positions.set(point.id, point.id === corner?.pointId ? corner.position : point.position)
    }
    return positions
  }, [line.points, corner])
}
