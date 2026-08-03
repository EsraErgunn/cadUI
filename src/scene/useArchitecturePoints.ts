import { useMemo } from 'react'

import type { Point } from '../core/model'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * Çizim için nokta havuzu: sürükleme varsa ilgili köşeler geçici konumuyla döner.
 *
 * Duvar da açıklık da bunu okur; ikisi de aynı havuzdan türediği için sürükleme
 * sırasında birlikte hareket ederler. Doğrudan cadStore okunsaydı köşe bırakılana
 * kadar yerinde donar, duvar imlecin arkasında kalırdı.
 *
 * Duvar ötelemesi iki köşeye birden uygulanır; o köşeleri paylaşan komşu duvarlar
 * da aynı havuzdan okuduğu için esneyerek takip eder.
 */
export function useArchitecturePoints(): Point[] {
  const points = useCadStore((state) => state.points)
  const walls = useCadStore((state) => state.walls)
  const draggingPoint = useArchitectureUiStore((state) => state.draggingPoint)
  const draggingWall = useArchitectureUiStore((state) => state.draggingWall)

  return useMemo(() => {
    if (draggingPoint) {
      return points.map((point) =>
        point.id === draggingPoint.pointId
          ? { ...point, x: draggingPoint.position.x, y: draggingPoint.position.y }
          : point,
      )
    }

    if (!draggingWall) return points

    const wall = walls.find((candidate) => candidate.id === draggingWall.wallId)
    if (!wall) return points

    const movingIds = new Set([wall.p1Id, wall.p2Id])
    return points.map((point) =>
      movingIds.has(point.id)
        ? { ...point, x: point.x + draggingWall.dxCm, y: point.y + draggingWall.dyCm }
        : point,
    )
  }, [points, walls, draggingPoint, draggingWall])
}
