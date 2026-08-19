import { useMemo } from 'react'

import type { Point, Wall } from '../core/model'
import { applyWallMove } from '../core/wallMoveDraft'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

export type ArchitectureDraft = {
  points: Point[]
  walls: Wall[]
}

/**
 * Ekranda gösterilecek çizim: sürükleme sürerken store'a HİÇ yazılmadığı için
 * (tek yazım = tek Ctrl+Z) çizimin "olacak hâli" burada türetilir.
 *
 * Duvar sürüklemesinde hesabı `core/wallMoveDraft.ts` → `applyWallMove`
 * yapıyor; geçerlilik denetimi de aynı fonksiyondan geçiyor ve store yazımı da
 * aynı kopma kararını kullanıyor. Üçü ayrı hesaplasaydı ekranda görülen,
 * reddedilen ve yazılan geometri birbirini tutmazdı — nitekim önizleme kopmayı
 * hiç göstermediği için tam olarak bu oluyordu (K103).
 *
 * ⚠️ Kopma klonlarının id'si NEGATİF ve geçici: store'a asla girmezler, yalnız
 * bu türetimde yaşarlar.
 */
export function useArchitectureDraft(): ArchitectureDraft {
  const points = useCadStore((state) => state.points)
  const walls = useCadStore((state) => state.walls)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const draggingPoint = useArchitectureUiStore((state) => state.draggingPoint)
  const draggingWall = useArchitectureUiStore((state) => state.draggingWall)

  return useMemo(() => {
    if (draggingPoint) {
      return {
        points: points.map((point) =>
          point.id === draggingPoint.pointId
            ? { ...point, x: draggingPoint.position.x, y: draggingPoint.position.y }
            : point,
        ),
        walls,
      }
    }

    if (!draggingWall) return { points, walls }

    const { wallIds, dxCm, dyCm } = draggingWall
    // Paralel kaydırma TEK duvar için tanımlı; çoklu seçim blok olarak ötelenir.
    if (wallIds.length !== 1) {
      const movingPointIds = new Set(
        walls.flatMap((wall) => (wallIds.includes(wall.id) ? [wall.p1Id, wall.p2Id] : [])),
      )
      return {
        points: points.map((point) =>
          movingPointIds.has(point.id)
            ? { ...point, x: point.x + dxCm, y: point.y + dyCm }
            : point,
        ),
        walls,
      }
    }

    return applyWallMove(walls, points, wallIds[0], dxCm, dyCm, activeFloorId)
  }, [points, walls, activeFloorId, draggingPoint, draggingWall])
}

/**
 * Yalnız nokta havuzunu isteyen çağıranlar için kısayol. Duvar bağlantısı
 * değişebildiği için (kopma) duvar ÇİZEN her yer `useArchitectureDraft`
 * kullanmalı — yalnız noktayı okumak kopmayı görmez.
 */
export function useArchitecturePoints(): Point[] {
  return useArchitectureDraft().points
}
