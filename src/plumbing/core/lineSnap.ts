import type { InstallationLine } from './installationModel'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { projectOntoSegment } from '../../core/wall'

export type LineSnapCandidate = {
  lineId: Id
  /** `points[segmentIndex]` → `points[segmentIndex + 1]` parçası. */
  segmentIndex: number
  position: PlanPoint
  /** Yakalanan yer mevcut bir köşeyse onun id'si — o zaman hat BÖLÜNMEZ. */
  pointId?: Id
}

/**
 * Köşeye bu kadar yaklaşan izdüşüm köşenin KENDİSİNE yapışır. Yoksa köşenin
 * hemen yanında sıfıra yakın uzunlukta bir parça doğuran bölme yapılırdı.
 */
const CORNER_SNAP_RATIO = 1.0

/**
 * İmlece en yakın hat noktası. Boru aracıyla mevcut bir borunun üstünde
 * gezerken bağlanılacak (ve gerekiyorsa boruyu ayıracak) yeri verir.
 *
 * Yarıçap piksel tabanlı gelir (çağıran zoom'a böler). Karşılaştırma en yakın
 * mesafeye göre; parça izdüşümü core/wall.ts'teki tek fonksiyondan alınır —
 * ikinci bir izdüşüm kopyası zamanla ondan ayrışırdı.
 */
export function findNearestPointOnLines(
  lines: readonly InstallationLine[],
  cursor: PlanPoint,
  radiusCm: number,
): LineSnapCandidate | null {
  if (radiusCm <= 0) return null
  let nearest: LineSnapCandidate | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const line of lines) {
    for (let index = 0; index + 1 < line.points.length; index += 1) {
      const from = line.points[index]
      const to = line.points[index + 1]
      const projection = projectOntoSegment(from.position, to.position, cursor)
      if (projection.distanceCm > radiusCm || projection.distanceCm >= nearestDistanceCm) continue

      const cornerToleranceCm = radiusCm * CORNER_SNAP_RATIO
      const corner = [from, to].find(
        (candidate) =>
          Math.hypot(
            candidate.position.x - projection.point.x,
            candidate.position.y - projection.point.y,
          ) <= cornerToleranceCm,
      )

      nearest = {
        lineId: line.id,
        segmentIndex: index,
        position: corner ? corner.position : projection.point,
        pointId: corner?.id,
      }
      nearestDistanceCm = projection.distanceCm
    }
  }

  return nearest
}
