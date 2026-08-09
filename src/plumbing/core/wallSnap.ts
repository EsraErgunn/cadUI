import type { PlanPoint } from '../../core/coords'
import type { Point, Wall } from '../../core/model'
import { projectPointOntoWall } from '../../core/wall'

export type WallSnapCandidate = {
  wallId: Wall['id']
  position: PlanPoint
}

/**
 * İmlece en yakın duvar EKSENİ noktası. Ürün kuralı gereği borular duvarlara
 * paralel çizilir ve genelde bir duvar hattı boyunca başlar; imleç duvara
 * yakınken çizim burada onun eksenine yapışır.
 *
 * BAĞLANTI değildir — boru grafiği duvarı TANIMAZ (core/model.ts sözleşmesi,
 * Node/Pipe yalnız birbirine bağlanır). Yalnız BAŞLANGIÇ KONUMU ızgara yerine
 * duvar eksenine çekilir; izdüşüm core/wall.ts'teki tek fonksiyondan alınır.
 */
export function findNearestWallPoint(
  walls: readonly Wall[],
  points: readonly Point[],
  cursor: PlanPoint,
  radiusCm: number,
): WallSnapCandidate | null {
  if (radiusCm <= 0) return null

  let nearest: WallSnapCandidate | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const wall of walls) {
    const projection = projectPointOntoWall(wall, points, cursor)
    if (!projection) continue
    if (projection.distanceCm > radiusCm || projection.distanceCm >= nearestDistanceCm) continue

    nearest = { wallId: wall.id, position: projection.point }
    nearestDistanceCm = projection.distanceCm
  }

  return nearest
}
