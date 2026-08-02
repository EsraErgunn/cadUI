import { useMemo } from 'react'

import type { Point } from '../core/model'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * Çizim için nokta havuzu: sürükleme varsa o köşe geçici konumuyla döner.
 *
 * Duvar da açıklık da bunu okur; ikisi de aynı havuzdan türediği için sürükleme
 * sırasında birlikte hareket ederler. Doğrudan cadStore okunsaydı köşe bırakılana
 * kadar yerinde donar, duvar imlecin arkasında kalırdı.
 */
export function useArchitecturePoints(): Point[] {
  const points = useCadStore((state) => state.points)
  const draggingPoint = useArchitectureUiStore((state) => state.draggingPoint)

  return useMemo(() => {
    if (!draggingPoint) return points

    return points.map((point) =>
      point.id === draggingPoint.pointId
        ? { ...point, x: draggingPoint.position.x, y: draggingPoint.position.y }
        : point,
    )
  }, [points, draggingPoint])
}
