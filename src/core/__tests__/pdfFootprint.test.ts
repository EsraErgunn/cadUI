import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import { getBuildingFootprint } from '../pdf/footprint'

const GROUND_FLOOR_ID = 1
const UPPER_FLOOR_ID = 2

function makePoint(id: number, x: number, y: number, floorId = GROUND_FLOOR_ID): Point {
  return { id, floorId, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, floorId = GROUND_FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: 20, height: 280 }
}

// 400×300'lük dikdörtgen bir zemin kat.
const POINTS: Point[] = [
  makePoint(10, 0, 0),
  makePoint(11, 400, 0),
  makePoint(12, 400, 300),
  makePoint(13, 0, 300),
]

const WALLS: Wall[] = [
  makeWall(20, 10, 11),
  makeWall(21, 11, 12),
  makeWall(22, 12, 13),
  makeWall(23, 13, 10),
]

const build = (overrides = {}) =>
  getBuildingFootprint({
    points: POINTS,
    walls: WALLS,
    floorId: GROUND_FLOOR_ID,
    serviceBox: undefined,
    ...overrides,
  })

describe('getBuildingFootprint', () => {
  it('istenen katın duvarlarını segment olarak verir', () => {
    const footprint = build()

    expect(footprint?.segments).toHaveLength(4)
    expect(footprint?.bounds).toEqual({ minX: 0, minY: 0, maxX: 400, maxY: 300 })
  })

  it('başka katın duvarlarını ALMAZ', () => {
    const footprint = build({
      points: [...POINTS, makePoint(30, 9000, 9000, UPPER_FLOOR_ID)],
      walls: [...WALLS, makeWall(31, 30, 30, UPPER_FLOOR_ID)],
    })

    expect(footprint?.segments).toHaveLength(4)
    // Üst kattaki uzak nokta sınırları büyütmemeli.
    expect(footprint?.bounds.maxX).toBe(400)
  })

  it('servis kutusunu sınırlara KATAR: bina dışında olabilir', () => {
    const footprint = build({ serviceBox: { x: 520, y: 150 } })

    expect(footprint?.serviceBox).toEqual({ x: 520, y: 150 })
    expect(footprint?.bounds.maxX).toBe(520)
  })

  it('noktası eksik duvarı atlar, patlamaz', () => {
    const footprint = build({ walls: [...WALLS, makeWall(24, 10, 999)] })

    expect(footprint?.segments).toHaveLength(4)
  })

  it('çizim de servis kutusu da yoksa undefined döner', () => {
    expect(build({ points: [], walls: [] })).toBeUndefined()
  })

  it('yalnız servis kutusu varken de kontur üretir', () => {
    const footprint = build({ points: [], walls: [], serviceBox: { x: 5, y: 7 } })

    expect(footprint?.segments).toHaveLength(0)
    expect(footprint?.bounds).toEqual({ minX: 5, minY: 7, maxX: 5, maxY: 7 })
  })
})
