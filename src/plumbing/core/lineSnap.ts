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

/** Paylaşılan boş küme: eleme istemeyen çağıranlar için. */
const NO_POINT_IDS: ReadonlySet<Id> = new Set()

export type LineCornerCandidate = { lineId: Id; pointId: Id; position: PlanPoint }

/**
 * İmlece en yakın hat KÖŞESİ — segment gövdesi aday DEĞİL. Köşe sürüklemesi
 * bunu kullanır: sürüklenen köşe başka bir köşenin yakınına gelince TAM
 * ÜSTÜNE oturur (kullanıcı isteği, 2026-08).
 *
 * Asıl derdi kot: saf dikey bir boru (K102) plan boyu SIFIR iki noktadan
 * ibaret; yanındaki yatay boru oynatılınca kaynaklı uç onunla gider, geride
 * kalan uçla arasında plan mesafesi doğar ve kolon eğik bir boruya dönüşür.
 * Köşeye geri getirildiğinde tam çakışma "gözle yaklaştırma" ile sağlanamaz —
 * bu yakalama olmadan yükseklik hiçbir zaman yeniden net olmaz.
 *
 * `excludedPointIds`: sürüklemeyle BİRLİKTE giden noktalar (`getLinkedLinePoints`)
 * — elenmezse köşe kendi kendine yapışırdı.
 */
export function findNearestLineCorner(
  lines: readonly InstallationLine[],
  cursor: PlanPoint,
  radiusCm: number,
  excludedPointIds: ReadonlySet<Id> = NO_POINT_IDS,
): LineCornerCandidate | null {
  if (radiusCm <= 0) return null

  let nearest: LineCornerCandidate | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const line of lines) {
    for (const point of line.points) {
      if (excludedPointIds.has(point.id)) continue

      const distanceCm = Math.hypot(point.position.x - cursor.x, point.position.y - cursor.y)
      if (distanceCm > radiusCm || distanceCm >= nearestDistanceCm) continue

      nearest = { lineId: line.id, pointId: point.id, position: point.position }
      nearestDistanceCm = distanceCm
    }
  }

  return nearest
}
