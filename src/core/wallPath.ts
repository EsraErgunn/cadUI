import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import {
  getSegmentAngleDeg,
  getSegmentLength,
  getSnapPoints,
  getWallEnds,
  projectPointOntoWall,
} from './wall'

export type WallFrame = {
  point: PlanPoint
  /** Duvarın o noktadaki teğet açısı (derece). Doğru duvarda sabit, yayda değişir. */
  tangentAngleDeg: number
  /**
   * Duvar eksenine dik BİRİM vektör; açıklık bandının kenarları buradan çıkar.
   * Açıdan trigonometriyle türetilmiyor: sin(90°) hesabı 6.1e-17 gibi artık
   * üretip -0/eşitlik karşılaştırmalarını şaşırtıyor.
   */
  normal: PlanPoint
}

export type WallHit = {
  wallId: Id
  offsetCm: number
  distanceCm: number
}

/**
 * offsetCm ↔ konum dönüşümünün TEK yeri. Yay duvar kararı verilirse (bkz.
 * knowledge/arc-walls.md) yalnız bu dosya değişir; açıklık kodu aynı kalır.
 * Ters yön için core/wall.ts → projectPointOntoWall kullanılır.
 */
export function getWallPathLengthCm(wall: Wall, points: readonly Point[]): number | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined
  return getSegmentLength(ends.p1, ends.p2)
}

export function getWallFrameAtOffsetCm(
  wall: Wall,
  points: readonly Point[],
  offsetCm: number,
): WallFrame | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined

  const lengthCm = getSegmentLength(ends.p1, ends.p2)
  // İki ucu çakışık duvarda yön tanımsız — projectOntoSegment ile aynı davranış.
  if (lengthCm === 0) {
    return { point: { ...ends.p1 }, tangentAngleDeg: 0, normal: { x: 0, y: 0 } }
  }

  // Bayat offset uzayda bir yere değil duvarın ucuna düşsün.
  const clampedCm = Math.min(lengthCm, Math.max(0, offsetCm))
  const ratio = clampedCm / lengthCm
  const unitX = (ends.p2.x - ends.p1.x) / lengthCm
  const unitY = (ends.p2.y - ends.p1.y) / lengthCm

  return {
    point: {
      x: normalizeZero(ends.p1.x + (ends.p2.x - ends.p1.x) * ratio),
      y: normalizeZero(ends.p1.y + (ends.p2.y - ends.p1.y) * ratio),
    },
    tangentAngleDeg: getSegmentAngleDeg(ends.p1, ends.p2),
    normal: { x: normalizeZero(-unitY), y: normalizeZero(unitX) },
  }
}

export function getPointAtOffsetCm(
  wall: Wall,
  points: readonly Point[],
  offsetCm: number,
): PlanPoint | undefined {
  return getWallFrameAtOffsetCm(wall, points, offsetCm)?.point
}

/**
 * getSnapPoints'i offset eksenine indirir. Duvar çizimi ve açıklık yerleştirme
 * AYNI snap kaynağını tüketir; sabit aralıklı bölüm noktası yok (K12).
 */
export function getSnapOffsetsCm(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): number[] {
  const offsets: number[] = []
  for (const snapPoint of getSnapPoints(wall, points, walls)) {
    const projection = projectPointOntoWall(wall, points, snapPoint)
    if (projection) offsets.push(projection.offsetCm)
  }
  return offsets
}

/** Tolerans içindeki en yakın snap offsetine yapışır; yoksa ham değer korunur. */
export function snapOffsetCm(
  rawOffsetCm: number,
  snapOffsetsCm: readonly number[],
  toleranceCm: number,
): number {
  let best: number | undefined
  let bestDistanceCm = Number.POSITIVE_INFINITY

  for (const candidateCm of snapOffsetsCm) {
    const distanceCm = Math.abs(candidateCm - rawOffsetCm)
    if (distanceCm > toleranceCm || distanceCm >= bestDistanceCm) continue
    best = candidateCm
    bestDistanceCm = distanceCm
  }

  return best ?? rawOffsetCm
}

/**
 * İmlecin ÜSTÜNDE olduğu duvar. resolveSnap bu iş için yetmez: 10 px eşiği
 * kalınlığı bilmez (%300 zoom'da eşik 3.3 cm, 20 cm duvarın görünen bandının
 * dışı ölü kalır) ve köşede kind:'point' dönüp wallId vermez.
 * Kabul: eksene dik uzaklık <= kalınlığın yarısı + tolerans. En yakın duvar kazanır.
 * Duvarlar kat filtresinden geçmiş gelir (resolveSnap ile aynı kompozisyon).
 */
export function findWallUnderPoint(
  target: PlanPoint,
  walls: readonly Wall[],
  points: readonly Point[],
  toleranceCm: number,
): WallHit | undefined {
  let best: WallHit | undefined

  for (const wall of walls) {
    const projection = projectPointOntoWall(wall, points, target)
    if (!projection) continue
    if (projection.distanceCm > wall.thickness / 2 + toleranceCm) continue
    if (best && projection.distanceCm >= best.distanceCm) continue

    best = {
      wallId: wall.id,
      offsetCm: projection.offsetCm,
      distanceCm: projection.distanceCm,
    }
  }

  return best
}
