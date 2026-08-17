import type { PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import {
  getSegmentLength,
  getWallEnds,
  getWallEndsFrom,
  getWallsAtPoint,
  MIN_WALL_LENGTH_CM,
  type PointIndex,
  type WallEnds,
} from './wall'

/**
 * Duvarın çizilen şekli: eksen doğru parçası + yarıçap (kapsül). Uçlar YUVARLAK
 * ve uç noktanın kendisinde merkezlidir.
 *
 * Bu, gönyeli dörtgenin yerini aldı (K23). Kritik sonuç: bir köşede birleşen her
 * duvarın ucu aynı r yarıçaplı diski doldurur, dolayısıyla kavşak kaç duvarlı
 * olursa olsun ve açılar ne olursa olsun boşluk kalmaz. Komşu bilgisine ihtiyaç
 * duyulmadığı için imza `walls` almaz.
 */
export type WallCapsule = {
  p1: PlanPoint
  p2: PlanPoint
  radiusCm: number
}

export function getWallCapsule(wall: Wall, points: readonly Point[]): WallCapsule | undefined {
  return toCapsule(wall, getWallEnds(wall, points))
}

/**
 * `getWallCapsule`'ün indeksli hâli. Duvar listesi çizen bileşenler bunu
 * kullanır: kapsül duvar başına çağrıldığı için havuzu her seferinde taramak
 * kare başına O(N·P) ederdi.
 */
export function getWallCapsuleFrom(wall: Wall, pointIndex: PointIndex): WallCapsule | undefined {
  return toCapsule(wall, getWallEndsFrom(wall, pointIndex))
}

function toCapsule(wall: Wall, ends: WallEnds | undefined): WallCapsule | undefined {
  if (!ends) return undefined

  // Kazara çift tıklamayla oluşan sıfır boy segment çizilmez.
  if (getSegmentLength(ends.p1, ends.p2) < MIN_WALL_LENGTH_CM) return undefined

  return { p1: ends.p1, p2: ends.p2, radiusCm: wall.thickness / 2 }
}

/**
 * Köşede birleşen duvarların orada doldurduğu diskin yarıçapı = en kalın
 * duvarın yarısı. Köşe vurgusu bu ölçüyü kullanır ki geometriyle örtüşsün.
 * Duvarı kalmamış köşede undefined.
 */
export function getJointRadiusCm(pointId: Id, walls: readonly Wall[]): number | undefined {
  const atPoint = getWallsAtPoint(pointId, walls)
  if (atPoint.length === 0) return undefined

  return Math.max(...atPoint.map((wall) => wall.thickness)) / 2
}
