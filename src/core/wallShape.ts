import type { PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import { getSegmentLength, getWallEnds, getWallsAtPoint, MIN_WALL_LENGTH_CM } from './wall'

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
  const ends = getWallEnds(wall, points)
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
