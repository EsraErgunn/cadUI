import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'

/** Bu farkın altındaki uzunluklar sıfır sayılır (kayan nokta karşılaştırması). */
const EPSILON_CM = 1e-6

const DEG_PER_RAD = 180 / Math.PI

export type WallEnds = { p1: PlanPoint; p2: PlanPoint }

export type WallProjection = {
  /** Hedefin duvar ekseni üzerindeki izdüşümü. */
  point: PlanPoint
  /** p1 ucundan itibaren uzaklık (cm). Segment dışına taşmaz. */
  offsetCm: number
  /** Hedefin duvar eksenine dik uzaklığı (cm). */
  distanceCm: number
}

/** Açıklığın ORTASININ durabileceği offset aralığı — bkz. knowledge/opening-placement.md. */
export type PlacementRange = {
  minOffsetCm: number
  maxOffsetCm: number
}

function findPoint(points: readonly Point[], pointId: Id): Point | undefined {
  return points.find((point) => point.id === pointId)
}

function isSamePlanPoint(a: PlanPoint, b: PlanPoint): boolean {
  return Math.abs(a.x - b.x) < EPSILON_CM && Math.abs(a.y - b.y) < EPSILON_CM
}

export function getSegmentLength(a: PlanPoint, b: PlanPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function getSegmentMidpoint(a: PlanPoint, b: PlanPoint): PlanPoint {
  return { x: normalizeZero((a.x + b.x) / 2), y: normalizeZero((a.y + b.y) / 2) }
}

export function getSegmentAngleDeg(a: PlanPoint, b: PlanPoint): number {
  return normalizeZero(Math.atan2(b.y - a.y, b.x - a.x) * DEG_PER_RAD)
}

/** Duvar koordinatını taşımaz, ortak havuza referans verir; uçları burada çözülür. */
export function getWallEnds(wall: Wall, points: readonly Point[]): WallEnds | undefined {
  const p1 = findPoint(points, wall.p1Id)
  const p2 = findPoint(points, wall.p2Id)
  if (!p1 || !p2) return undefined
  return { p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y } }
}

export function projectOntoSegment(
  a: PlanPoint,
  b: PlanPoint,
  target: PlanPoint,
): WallProjection {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSqCm = dx * dx + dy * dy

  // İki ucu çakışık duvar: yön tanımsız, izdüşüm p1'in kendisidir.
  if (lengthSqCm < EPSILON_CM) {
    return { point: { ...a }, offsetCm: 0, distanceCm: getSegmentLength(a, target) }
  }

  const rawRatio = ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSqCm
  // Uçların dışına taşan izdüşüm duvarın üzerinde değildir; uca sabitlenir.
  const ratio = Math.min(1, Math.max(0, rawRatio))
  const point = {
    x: normalizeZero(a.x + dx * ratio),
    y: normalizeZero(a.y + dy * ratio),
  }

  return {
    point,
    offsetCm: Math.sqrt(lengthSqCm) * ratio,
    distanceCm: getSegmentLength(point, target),
  }
}

export function projectPointOntoWall(
  wall: Wall,
  points: readonly Point[],
  target: PlanPoint,
): WallProjection | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined
  return projectOntoSegment(ends.p1, ends.p2, target)
}

/** Bir köşede birleşen duvarlar. Köşe taşıma ve köşe payı hesabı bunu kullanır. */
export function getWallsAtPoint(pointId: Id, walls: readonly Wall[]): Wall[] {
  return walls.filter((wall) => wall.p1Id === pointId || wall.p2Id === pointId)
}

function getSegmentIntersection(
  a1: PlanPoint,
  a2: PlanPoint,
  b1: PlanPoint,
  b2: PlanPoint,
): PlanPoint | undefined {
  const aDx = a2.x - a1.x
  const aDy = a2.y - a1.y
  const bDx = b2.x - b1.x
  const bDy = b2.y - b1.y

  const denominator = aDx * bDy - aDy * bDx
  // Paralel (veya üst üste) segmentlerin tek bir kesişim noktası yoktur.
  if (Math.abs(denominator) < EPSILON_CM) return undefined

  const aRatio = ((b1.x - a1.x) * bDy - (b1.y - a1.y) * bDx) / denominator
  const bRatio = ((b1.x - a1.x) * aDy - (b1.y - a1.y) * aDx) / denominator
  if (aRatio < 0 || aRatio > 1 || bRatio < 0 || bRatio > 1) return undefined

  return { x: normalizeZero(a1.x + aDx * aRatio), y: normalizeZero(a1.y + aDy * aRatio) }
}

/**
 * Yakalanabilir noktalar: iki uç, orta nokta, diğer duvarlarla kesişimler.
 * Sabit aralıklı bölüm noktası ÜRETİLMEZ — bkz. knowledge/snap-contract.md.
 */
export function getSnapPoints(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): PlanPoint[] {
  const ends = getWallEnds(wall, points)
  if (!ends) return []

  const result: PlanPoint[] = [ends.p1, ends.p2, getSegmentMidpoint(ends.p1, ends.p2)]

  for (const other of walls) {
    if (other.id === wall.id || other.floorId !== wall.floorId) continue

    const otherEnds = getWallEnds(other, points)
    if (!otherEnds) continue

    const intersection = getSegmentIntersection(ends.p1, ends.p2, otherEnds.p1, otherEnds.p2)
    // Ortak köşe zaten uç olarak listede; tekrar eklenmesin.
    if (intersection && !result.some((existing) => isSamePlanPoint(existing, intersection))) {
      result.push(intersection)
    }
  }

  return result
}

/** Uçta duvar yoksa pay yok; birden çok duvar birleşiyorsa en kalını esas alınır (K11). */
function getCornerClearanceCm(wall: Wall, pointId: Id, walls: readonly Wall[]): number {
  const neighbours = getWallsAtPoint(pointId, walls).filter((other) => other.id !== wall.id)
  if (neighbours.length === 0) return 0
  return Math.max(...neighbours.map((neighbour) => neighbour.thickness))
}

/**
 * Köşede dik duvarın kütlesi var, açıklık oraya sığmaz: uçtan itibaren o duvarın
 * kalınlığı kadar mesafe bırakılır (K11). minOffsetCm > maxOffsetCm ise duvara
 * hiç açıklık sığmıyordur.
 */
export function getPlacementRange(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): PlacementRange | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined

  const lengthCm = getSegmentLength(ends.p1, ends.p2)
  return {
    minOffsetCm: getCornerClearanceCm(wall, wall.p1Id, walls),
    maxOffsetCm: lengthCm - getCornerClearanceCm(wall, wall.p2Id, walls),
  }
}
