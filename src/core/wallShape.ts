import { union, type Geometry, type Ring } from 'martinez-polygon-clipping'

import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import { getSegmentLength, getWallEnds, getWallsAtPoint, MIN_WALL_LENGTH_CM } from './wall'

const EPSILON_CM = 1e-6

/**
 * Gönye ucunun yarı kalınlığa oranı. Açı daraldıkça kesişim uçup gider; bu oranı
 * aşan uç kısaltılır (pah). 4 ≈ 29°'den dar açılarda kesme devreye girer —
 * SVG/canvas'ın varsayılan miterlimit'iyle aynı eşik.
 */
const MITER_LIMIT_RATIO = 4

type Vector = { x: number; y: number }

type Neighbour = {
  /** Ortak köşeden UZAKLAŞAN birim yön. */
  direction: Vector
  halfThicknessCm: number
}

function perpendicular(vector: Vector): Vector {
  return { x: -vector.y, y: vector.x }
}

function getUnitDirection(from: PlanPoint, to: PlanPoint): Vector | undefined {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthCm = Math.hypot(dx, dy)
  if (lengthCm < EPSILON_CM) return undefined
  return { x: dx / lengthCm, y: dy / lengthCm }
}

function intersectLines(
  pointA: PlanPoint,
  directionA: Vector,
  pointB: PlanPoint,
  directionB: Vector,
): PlanPoint | undefined {
  const denominator = directionA.x * directionB.y - directionA.y * directionB.x
  // Paralel (düz devam eden veya üst üste) kenarların kesişimi yoktur.
  if (Math.abs(denominator) < EPSILON_CM) return undefined

  const ratio =
    ((pointB.x - pointA.x) * directionB.y - (pointB.y - pointA.y) * directionB.x) / denominator
  return { x: pointA.x + directionA.x * ratio, y: pointA.y + directionA.y * ratio }
}

/** Gönye ancak TEK komşuda tanımlı: üç duvarın birleştiği köşede tek bir kesişim yoktur. */
function getSingleNeighbour(
  wall: Wall,
  pointId: Id,
  joint: PlanPoint,
  points: readonly Point[],
  walls: readonly Wall[],
): Neighbour | undefined {
  const neighbours = getWallsAtPoint(pointId, walls).filter(
    (candidate) => candidate.id !== wall.id && candidate.floorId === wall.floorId,
  )
  if (neighbours.length !== 1) return undefined

  const neighbour = neighbours[0]
  const ends = getWallEnds(neighbour, points)
  if (!ends) return undefined

  const away = neighbour.p1Id === pointId ? ends.p2 : ends.p1
  const direction = getUnitDirection(joint, away)
  if (!direction) return undefined

  return { direction, halfThicknessCm: neighbour.thickness / 2 }
}

/**
 * Uçtaki bir kenar köşesi. Komşu varsa iki duvarın kenar çizgilerinin kesişimi
 * (gönye) alınır — dikdörtgen uçları uzatmak yalnız dik açıda doğru sonuç verir,
 * dar açıda testere dişi bırakır.
 *
 * `localSide`, ucun kendi uzaklaşma yönüne göre hangi kenarda olduğudur. Komşuda
 * karşılık gelen kenar TERSİDİR: iki yön de ortak köşeden uzaklaştığı için
 * sınırı takip ederken el değiştirir.
 */
function getEndCorner(
  joint: PlanPoint,
  awayDirection: Vector,
  halfThicknessCm: number,
  localSide: 1 | -1,
  neighbour: Neighbour | undefined,
): PlanPoint {
  const normal = perpendicular(awayDirection)
  const squareCorner = {
    x: joint.x + normal.x * localSide * halfThicknessCm,
    y: joint.y + normal.y * localSide * halfThicknessCm,
  }
  if (!neighbour) return squareCorner

  const neighbourNormal = perpendicular(neighbour.direction)
  const neighbourEdgePoint = {
    x: joint.x + neighbourNormal.x * -localSide * neighbour.halfThicknessCm,
    y: joint.y + neighbourNormal.y * -localSide * neighbour.halfThicknessCm,
  }

  const corner = intersectLines(
    squareCorner,
    awayDirection,
    neighbourEdgePoint,
    neighbour.direction,
  )
  if (!corner) return squareCorner

  const limitCm = MITER_LIMIT_RATIO * Math.max(halfThicknessCm, neighbour.halfThicknessCm)
  const distanceCm = Math.hypot(corner.x - joint.x, corner.y - joint.y)
  if (distanceCm <= limitCm) return corner

  // Sınırı aşan sivri uç yönü korunarak kısaltılır: iki kenar köşesi birlikte
  // çekilince aralarında pah kalır, boşluk açılmaz.
  const scale = limitCm / distanceCm
  return {
    x: joint.x + (corner.x - joint.x) * scale,
    y: joint.y + (corner.y - joint.y) * scale,
  }
}

/**
 * Duvarın çizilen dörtgeni, saat yönünün tersine:
 * p1-sol, p1-sağ, p2-sağ, p2-sol. Dik olmayan birleşimlerde köşeler gönyelenir.
 */
export function getWallPolygon(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): PlanPoint[] | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined
  if (getSegmentLength(ends.p1, ends.p2) < MIN_WALL_LENGTH_CM) return undefined

  const forward = getUnitDirection(ends.p1, ends.p2)
  if (!forward) return undefined
  const backward = { x: -forward.x, y: -forward.y }

  const halfCm = wall.thickness / 2
  const startNeighbour = getSingleNeighbour(wall, wall.p1Id, ends.p1, points, walls)
  const endNeighbour = getSingleNeighbour(wall, wall.p2Id, ends.p2, points, walls)

  // p2 ucunda uzaklaşma yönü ters döndüğü için "sol" orada localSide = -1 olur.
  const corners = [
    getEndCorner(ends.p1, forward, halfCm, 1, startNeighbour),
    getEndCorner(ends.p1, forward, halfCm, -1, startNeighbour),
    getEndCorner(ends.p2, backward, halfCm, 1, endNeighbour),
    getEndCorner(ends.p2, backward, halfCm, -1, endNeighbour),
  ]

  return corners.map((corner) => ({ x: normalizeZero(corner.x), y: normalizeZero(corner.y) }))
}

function toClosedRing(polygon: readonly PlanPoint[]): Ring {
  const ring: Ring = polygon.map((point) => [point.x, point.y])
  // martinez kapalı halka bekler: ilk nokta sonda tekrarlanır.
  ring.push([polygon[0].x, polygon[0].y])
  return ring
}

function isMultiPolygon(geometry: Geometry): boolean {
  return Array.isArray(geometry[0]?.[0]?.[0])
}

/**
 * Duvarların birleşiminin dış konturu. Her duvar kendi çerçevesini çizseydi
 * köşelerde komşunun içinden geçen çizgiler görünür ve duvarlar bütün durmazdı;
 * birleştirilmiş şeklin konturu bu iç çizgileri barındırmaz.
 * Dönen her halka kapalıdır (son nokta = ilk nokta).
 */
export function getWallOutlines(walls: readonly Wall[], points: readonly Point[]): PlanPoint[][] {
  const rings: Ring[] = []
  for (const wall of walls) {
    const polygon = getWallPolygon(wall, points, walls)
    if (polygon) rings.push(toClosedRing(polygon))
  }
  if (rings.length === 0) return []

  let merged: Geometry = [rings[0]]
  for (let index = 1; index < rings.length; index += 1) {
    // Ayrık duvarlarda union null dönebilir; o durumda birikeni koru.
    merged = union(merged, [rings[index]]) ?? merged
  }

  const polygons = isMultiPolygon(merged) ? (merged as Ring[][]) : [merged as Ring[]]
  return polygons.flatMap((polygon) => polygon.map((ring) => ring.map(([x, y]) => ({ x, y }))))
}
