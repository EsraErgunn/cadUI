import type { Opening, Point, Wall } from '../model'

/**
 * store/__tests__/architectureFixture.ts'teki sahnenin core kopyası — core, store'u
 * import EDEMEZ (eslint katman kuralı). İki taraf ayrışırsa testler yanıltır,
 * bu yüzden id'ler ve ölçüler birebir aynı tutulur.
 */
export const FLOOR_ID = 1

export function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

export function makeWall(id: number, p1Id: number, p2Id: number, thickness: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness, height: 280 }
}

export const points = [
  makePoint(2, 0, 0),
  makePoint(3, 500, 0),
  makePoint(4, 500, 400),
  makePoint(5, 0, 400),
  makePoint(6, 600, 0),
  makePoint(7, 900, 400),
]

/** 500 cm yatay; iki ucu da köşeye bağlı. */
export const horizontal = makeWall(8, 2, 3, 20)
export const rightCorner = makeWall(9, 3, 4, 30)
export const leftCorner = makeWall(10, 2, 5, 25)
/** Serbest çapraz (3-4-5, uzunluk tam 500) — ertelenmiş yay vakası. */
export const diagonal = makeWall(11, 6, 7, 20)

export const walls = [horizontal, rightCorner, leftCorner, diagonal]

export const window12: Opening = {
  id: 12,
  wallId: 8,
  offsetCm: 250,
  widthCm: 120,
  type: 'window',
}

/** Köşe payı: p1 ucunda 25 (duvar 10), p2 ucunda 30 (duvar 9) → 500 - 30. */
export const RANGE_OF_WALL_8 = { minOffsetCm: 25, maxOffsetCm: 470 }
