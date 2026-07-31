import { union, type Geometry, type Ring } from 'martinez-polygon-clipping'

import { normalizeZero, type PlanPoint } from './coords'
import type { Point, Wall } from './model'
import {
  getNeighbourThicknessCm,
  getSegmentAngleDeg,
  getSegmentLength,
  getWallEnds,
  MIN_WALL_LENGTH_CM,
} from './wall'

const RAD_PER_DEG = Math.PI / 180

/** Çizilecek dikdörtgen: köşe birleşimleri için uzatılmış hali. */
export type WallRenderGeometry = {
  center: PlanPoint
  lengthCm: number
  angleDeg: number
}

/**
 * Duvar, orta çizgisi boyunca uzanan bir dikdörtgen olarak çizilir. Uçlar tam
 * köşe noktasında bitseydi dik birleşimin DIŞ köşesinde kalınlığın yarısı kadar
 * kare bir çentik kalırdı. Birleşen uç, komşunun yarı kalınlığı kadar uzatılarak
 * kapatılır: dik açıda tam oturur, diğer açılarda taşan kısım aynı renkte olduğu
 * için görünmez.
 */
export function getWallRenderGeometry(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): WallRenderGeometry | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined

  const lengthCm = getSegmentLength(ends.p1, ends.p2)
  if (lengthCm < MIN_WALL_LENGTH_CM) return undefined

  const startExtensionCm = getNeighbourThicknessCm(wall, wall.p1Id, walls) / 2
  const endExtensionCm = getNeighbourThicknessCm(wall, wall.p2Id, walls) / 2

  // Uzatma iki uçta farklıysa orta nokta da aradaki farkın yarısı kadar kayar.
  const directionX = (ends.p2.x - ends.p1.x) / lengthCm
  const directionY = (ends.p2.y - ends.p1.y) / lengthCm
  const shiftCm = (endExtensionCm - startExtensionCm) / 2

  return {
    center: {
      x: normalizeZero((ends.p1.x + ends.p2.x) / 2 + directionX * shiftCm),
      y: normalizeZero((ends.p1.y + ends.p2.y) / 2 + directionY * shiftCm),
    },
    lengthCm: lengthCm + startExtensionCm + endExtensionCm,
    angleDeg: getSegmentAngleDeg(ends.p1, ends.p2),
  }
}

/** Duvarın çizilen dikdörtgeninin dört köşesi (saat yönünün tersine). */
export function getWallPolygon(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): PlanPoint[] | undefined {
  const geometry = getWallRenderGeometry(wall, points, walls)
  if (!geometry) return undefined

  const angleRad = geometry.angleDeg * RAD_PER_DEG
  const alongX = Math.cos(angleRad)
  const alongY = Math.sin(angleRad)
  const halfLengthCm = geometry.lengthCm / 2
  const halfThicknessCm = wall.thickness / 2

  // Dike bakan vektör: yönün 90° döndürülmüşü.
  const acrossX = -alongY
  const acrossY = alongX

  return [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ].map(([alongSign, acrossSign]) => ({
    x: normalizeZero(
      geometry.center.x +
        alongX * halfLengthCm * alongSign +
        acrossX * halfThicknessCm * acrossSign,
    ),
    y: normalizeZero(
      geometry.center.y +
        alongY * halfLengthCm * alongSign +
        acrossY * halfThicknessCm * acrossSign,
    ),
  }))
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
