import { describe, expect, it } from 'vitest'

import type { Opening, Point, Wall } from '../model'
import { getPointMoveImpact, getWallMoveImpact } from '../wall'
import { findBlockingOpeningInSegments } from '../wallGraph'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness: 20, height: 280 }
}

describe('getPointMoveImpact', () => {
  // Köşe 2, iki duvarı birleştiriyor: (0,0)-(200,0) ve (200,0)-(200,300).
  const points = [makePoint(1, 0, 0), makePoint(2, 200, 0), makePoint(3, 200, 300)]
  const walls = [makeWall(10, 1, 2), makeWall(11, 2, 3)]

  it('köşeye bağlı HER duvar için yeni segment üretir', () => {
    const impact = getPointMoveImpact(2, { x: 500, y: 500 }, walls, points)

    expect(impact.segments).toHaveLength(2)
    expect(impact.segments).toContainEqual({ p1: { x: 0, y: 0 }, p2: { x: 500, y: 500 } })
    expect(impact.segments).toContainEqual({ p1: { x: 200, y: 300 }, p2: { x: 500, y: 500 } })
  })

  it('köşeye bağlı duvarları stationaryWalls listesinden ÇIKARIR', () => {
    const impact = getPointMoveImpact(2, { x: 500, y: 500 }, walls, points)

    expect(impact.stationaryWalls).toEqual([])
  })

  it('köşeye bağlı olmayan duvar stationaryWalls olarak kalır', () => {
    const unrelated = makeWall(12, 1, 3)
    const impact = getPointMoveImpact(2, { x: 500, y: 500 }, [...walls, unrelated], points)

    expect(impact.stationaryWalls).toEqual([unrelated])
  })

  it('köşeye hiçbir duvar bağlı değilse boş segment listesi döner', () => {
    const impact = getPointMoveImpact(99, { x: 0, y: 0 }, walls, points)

    expect(impact.segments).toEqual([])
    expect(impact.stationaryWalls).toEqual(walls)
  })
})

describe('getWallMoveImpact', () => {
  const points = [makePoint(1, 0, 0), makePoint(2, 400, 0)]
  const wall = makeWall(10, 1, 2)

  it('duvarı KATI olarak öteler — iki ucu da aynı dx/dy alır', () => {
    const impact = getWallMoveImpact([10], 50, -20, [wall], points)

    expect(impact.segments).toEqual([{ p1: { x: 50, y: -20 }, p2: { x: 450, y: -20 } }])
  })

  it('taşınan duvarı stationaryWalls listesinden ÇIKARIR', () => {
    const impact = getWallMoveImpact([10], 50, -20, [wall], points)

    expect(impact.stationaryWalls).toEqual([])
  })

  it('taşınmayan duvar stationaryWalls olarak kalır', () => {
    const other = makeWall(11, 1, 2)
    const impact = getWallMoveImpact([10], 50, -20, [wall, other], points)

    expect(impact.stationaryWalls).toEqual([other])
  })

  it('birden çok duvar (grup taşıma) hepsi için segment üretir', () => {
    const second = makeWall(11, 1, 2)
    const impact = getWallMoveImpact([10, 11], 10, 10, [wall, second], points)

    expect(impact.segments).toHaveLength(2)
  })
})

describe('findBlockingOpeningInSegments', () => {
  function makeOpening(id: number, wallId: number, offsetCm: number, widthCm: number): Opening {
    return { id, wallId, offsetCm, widthCm, type: 'door' }
  }

  const points = [makePoint(1, 0, 0), makePoint(2, 400, 0)]
  const wall = makeWall(10, 1, 2)
  const door = makeOpening(20, 10, 200, 100)

  it('listedeki HERHANGİ bir segment blokeliyse o açıklığı döner', () => {
    const segments = [
      { p1: { x: 0, y: 500 }, p2: { x: 0, y: 600 } }, // masum
      { p1: { x: 200, y: -100 }, p2: { x: 200, y: 100 } }, // blokeli
    ]

    expect(findBlockingOpeningInSegments(segments, [wall], points, [door], FLOOR_ID)).toBe(door)
  })

  it('hiçbir segment blokeli değilse undefined döner', () => {
    const segments = [
      { p1: { x: 0, y: 500 }, p2: { x: 0, y: 600 } },
      { p1: { x: 50, y: -100 }, p2: { x: 50, y: 100 } },
    ]

    expect(
      findBlockingOpeningInSegments(segments, [wall], points, [door], FLOOR_ID),
    ).toBeUndefined()
  })

  it('boş segment listesinde undefined döner', () => {
    expect(findBlockingOpeningInSegments([], [wall], points, [door], FLOOR_ID)).toBeUndefined()
  })
})
