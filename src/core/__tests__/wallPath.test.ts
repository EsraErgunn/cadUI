import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import {
  findWallUnderPoint,
  getPointAtOffsetCm,
  getSnapOffsetsCm,
  getWallFrameAtOffsetCm,
  getWallPathLengthCm,
  snapOffsetCm,
} from '../wallPath'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, thickness: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness, height: 280 }
}

// Yatay duvar (500 cm, kalınlık 20) + 3-4-5 çapraz duvar (uzunluk tam 500).
const points = [
  makePoint(1, 0, 0),
  makePoint(2, 500, 0),
  makePoint(3, 600, 0),
  makePoint(4, 900, 400),
]
const horizontal = makeWall(10, 1, 2, 20)
const diagonal = makeWall(11, 3, 4, 20)

describe('getWallPathLengthCm', () => {
  it('düz duvarda uçlar arası uzunluğu verir', () => {
    expect(getWallPathLengthCm(horizontal, points)).toBe(500)
  })

  it('çapraz duvarda kiriş uzunluğunu verir', () => {
    expect(getWallPathLengthCm(diagonal, points)).toBe(500)
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getWallPathLengthCm(makeWall(99, 1, 404, 20), points)).toBeUndefined()
  })

  it('iki ucu çakışık duvarda sıfır döner', () => {
    const collapsed = [makePoint(1, 0, 0), makePoint(2, 0, 0)]
    expect(getWallPathLengthCm(horizontal, collapsed)).toBe(0)
  })
})

describe('getPointAtOffsetCm', () => {
  it('p1 ucunu 0 offsetinde verir', () => {
    expect(getPointAtOffsetCm(horizontal, points, 0)).toEqual({ x: 0, y: 0 })
  })

  it('p2 ucunu tam uzunlukta verir', () => {
    expect(getPointAtOffsetCm(horizontal, points, 500)).toEqual({ x: 500, y: 0 })
  })

  it('duvarın ortasını verir', () => {
    expect(getPointAtOffsetCm(horizontal, points, 250)).toEqual({ x: 250, y: 0 })
  })

  it('çapraz duvarda offseti eğri boyunca ölçer', () => {
    // 500 cm'lik 3-4-5 duvarın yarısı: p1 + (300, 400) * 0.5.
    expect(getPointAtOffsetCm(diagonal, points, 250)).toEqual({ x: 750, y: 200 })
  })

  it('negatif offseti p1 ucuna sabitler', () => {
    expect(getPointAtOffsetCm(horizontal, points, -50)).toEqual({ x: 0, y: 0 })
  })

  it('duvarı aşan offseti p2 ucuna sabitler', () => {
    expect(getPointAtOffsetCm(horizontal, points, 900)).toEqual({ x: 500, y: 0 })
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getPointAtOffsetCm(makeWall(99, 1, 404, 20), points, 100)).toBeUndefined()
  })

  it('iki ucu çakışık duvarda p1 döner, sıfıra bölmez', () => {
    const collapsed = [makePoint(1, 30, 40), makePoint(2, 30, 40)]
    expect(getPointAtOffsetCm(horizontal, collapsed, 100)).toEqual({ x: 30, y: 40 })
  })
})

describe('getWallFrameAtOffsetCm', () => {
  it('yatay duvarda teğet açısı sıfır, normal +y yönündedir', () => {
    expect(getWallFrameAtOffsetCm(horizontal, points, 250)).toEqual({
      point: { x: 250, y: 0 },
      tangentAngleDeg: 0,
      normal: { x: 0, y: 1 },
    })
  })

  it('dikey duvarda teğet açısı 90 derece, normalde trigonometri artığı olmaz', () => {
    const verticalPoints = [makePoint(1, 0, 0), makePoint(2, 0, 300)]
    const frame = getWallFrameAtOffsetCm(horizontal, verticalPoints, 150)

    expect(frame?.tangentAngleDeg).toBe(90)
    // sin/cos ile türetilseydi y burada 6.1e-17 olurdu ve toEqual şaşardı.
    expect(frame?.normal).toEqual({ x: -1, y: 0 })
  })

  it('çapraz duvarda teğet açısını verir', () => {
    expect(getWallFrameAtOffsetCm(diagonal, points, 250)?.tangentAngleDeg).toBeCloseTo(53.1301, 4)
  })
})

describe('findWallUnderPoint', () => {
  const walls = [horizontal, diagonal]

  it('kalınlık bandının içindeki imleci duvara isabet sayar', () => {
    // 20 cm kalınlık → yarım bant 10 cm; 8 cm içeride, tolerans olmadan bile isabet.
    expect(findWallUnderPoint({ x: 250, y: 8 }, walls, points, 0)).toEqual({
      wallId: 10,
      offsetCm: 250,
      distanceCm: 8,
    })
  })

  it('bandın dışında toleranssız isabet vermez', () => {
    expect(findWallUnderPoint({ x: 250, y: 12 }, walls, points, 0)).toBeUndefined()
  })

  it('tolerans bandı genişletir', () => {
    expect(findWallUnderPoint({ x: 250, y: 12 }, walls, points, 5)?.wallId).toBe(10)
  })

  it('üst üste binen duvarlarda en yakını kazanır', () => {
    const overlapPoints = [...points, makePoint(5, 0, 6), makePoint(6, 500, 6)]
    const overlapping = makeWall(12, 5, 6, 20)

    expect(findWallUnderPoint({ x: 250, y: 5 }, [horizontal, overlapping], overlapPoints, 0)?.wallId).toBe(12)
  })

  it('hiçbir duvarın üstünde değilse undefined döner', () => {
    expect(findWallUnderPoint({ x: 250, y: 400 }, walls, points, 0)).toBeUndefined()
  })

  it('duvar listesi boşsa undefined döner', () => {
    expect(findWallUnderPoint({ x: 0, y: 0 }, [], points, 10)).toBeUndefined()
  })

  it('ucu eksik duvarı atlar', () => {
    expect(findWallUnderPoint({ x: 0, y: 0 }, [makeWall(99, 1, 404, 20)], points, 10)).toBeUndefined()
  })
})

describe('getSnapOffsetsCm', () => {
  it('uçları ve orta noktayı offset olarak verir', () => {
    expect(getSnapOffsetsCm(horizontal, points, [horizontal])).toEqual([0, 500, 250])
  })

  it('sabit aralıklı bölüm noktası üretmez', () => {
    // 500 cm duvar 2 m'de bölünseydi 200 ve 400'de de offset beklenirdi (K12).
    expect(getSnapOffsetsCm(horizontal, points, [horizontal])).toHaveLength(3)
  })

  it('kesişen duvarın kesişim offsetini ekler', () => {
    const crossingPoints = [...points, makePoint(5, 300, -100), makePoint(6, 300, 100)]
    const crossing = makeWall(12, 5, 6, 20)

    expect(getSnapOffsetsCm(horizontal, crossingPoints, [horizontal, crossing])).toContain(300)
  })

  it('ucu eksik duvarda boş döner', () => {
    expect(getSnapOffsetsCm(makeWall(99, 1, 404, 20), points, [])).toEqual([])
  })
})

describe('snapOffsetCm', () => {
  it('tolerans içindeki en yakın offsete yapışır', () => {
    expect(snapOffsetCm(248, [0, 500, 250], 5)).toBe(250)
  })

  it('tolerans dışındaysa ham değeri korur', () => {
    expect(snapOffsetCm(100, [0, 500, 250], 5)).toBe(100)
  })

  it('iki aday da toleranstaysa daha yakınını seçer', () => {
    expect(snapOffsetCm(104, [100, 110], 10)).toBe(100)
  })

  it('aday yoksa ham değeri korur', () => {
    expect(snapOffsetCm(137.5, [], 10)).toBe(137.5)
  })
})
