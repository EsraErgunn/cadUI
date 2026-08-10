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
 * Duvar ötelemesi taşınan HER duvarın iki köşesine uygulanır; o köşeleri paylaşan
 * komşu duvarlar da aynı havuzdan okuduğu için esneyerek takip eder.
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

    // Set: bir köşeyi iki taşınan duvar paylaşabilir, öteleme iki kez uygulanmasın.
    const movingIds = new Set<Point['id']>()
    for (const wall of walls) {
      if (!draggingWall.wallIds.includes(wall.id)) continue
      movingIds.add(wall.p1Id)
      movingIds.add(wall.p2Id)
    }
    if (movingIds.size === 0) return points
    return points.map((point) =>
      movingIds.has(point.id)
        ? { ...point, x: point.x + draggingWall.dxCm, y: point.y + draggingWall.dyCm }
        : point,
    )
  }, [points, walls, draggingPoint, draggingWall])
}
