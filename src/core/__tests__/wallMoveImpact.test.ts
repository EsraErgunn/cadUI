import { describe, expect, it } from 'vitest'

import type { Opening, Point, Wall } from '../model'
import { getPointMoveImpact, getWallMoveImpact } from '../wall'
import {
  findBlockingOpeningForMove,
  findBlockingOpeningInSegments,
  findBlockingOpeningOnMovedWalls,
} from '../wallGraph'

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
    // Uçlar duvarın p1 → p2 sırasında: duvar 10'da taşınan uç p2, duvar 11'de p1.
    expect(impact.segments).toContainEqual({
      wallId: 10,
      p1: { x: 0, y: 0 },
      p2: { x: 500, y: 500 },
    })
    expect(impact.segments).toContainEqual({
      wallId: 11,
      p1: { x: 500, y: 500 },
      p2: { x: 200, y: 300 },
    })
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

    expect(impact.segments).toEqual([
      { wallId: 10, p1: { x: 50, y: -20 }, p2: { x: 450, y: -20 } },
    ])
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

/**
 * K48: taşınan duvarın KENDİ açıklığı sabit bir duvarın üstüne geldiğinde de
 * reddedilmeli. Eskiden yalnız ters yön kontrol ediliyordu ve bu vaka SESSİZCE
 * geçiyordu — kullanıcı kapıyı duvarın içine gömebiliyordu.
 */
describe('findBlockingOpeningOnMovedWalls', () => {
  function makeOpening(id: number, wallId: number, offsetCm: number, widthCm: number): Opening {
    return { id, wallId, offsetCm, widthCm, type: 'door' }
  }

  // Sabit duvar: x=250'de düşey bir engel, (250,-100)-(250,100).
  const stationaryPoints = [makePoint(1, 250, -100), makePoint(2, 250, 100)]
  const stationaryWall = makeWall(10, 1, 2)
  // Taşınan duvar 11 yatay; kapısı p1 ucundan 200-300 cm aralığında.
  const movedDoor = makeOpening(20, 11, 250, 100)

  it('taşınan duvarın kapısı sabit duvarın üstüne gelirse o açıklığı döner', () => {
    const moved = [{ wallId: 11, p1: { x: 0, y: 0 }, p2: { x: 400, y: 0 } }]

    expect(
      findBlockingOpeningOnMovedWalls(
        moved,
        [stationaryWall],
        stationaryPoints,
        [movedDoor],
        FLOOR_ID,
      ),
    ).toBe(movedDoor)
  })

  it('kesişim kapının DIŞINDA kalıyorsa engel yok', () => {
    // Duvar sağa kayınca kesişim p1'den 50 cm'de kalıyor; kapı 200-300 aralığında.
    const moved = [{ wallId: 11, p1: { x: 200, y: 0 }, p2: { x: 600, y: 0 } }]

    expect(
      findBlockingOpeningOnMovedWalls(
        moved,
        [stationaryWall],
        stationaryPoints,
        [movedDoor],
        FLOOR_ID,
      ),
    ).toBeUndefined()
  })

  it('açıklığı olmayan taşınan duvar hiçbir şeyi bloklamaz', () => {
    const moved = [{ wallId: 12, p1: { x: 0, y: 0 }, p2: { x: 400, y: 0 } }]

    expect(
      findBlockingOpeningOnMovedWalls(
        moved,
        [stationaryWall],
        stationaryPoints,
        [movedDoor],
        FLOOR_ID,
      ),
    ).toBeUndefined()
  })

  it('başka kattaki sabit duvar görülmez', () => {
    const moved = [{ wallId: 11, p1: { x: 0, y: 0 }, p2: { x: 400, y: 0 } }]

    expect(
      findBlockingOpeningOnMovedWalls(
        moved,
        [{ ...stationaryWall, floorId: 99 }],
        stationaryPoints,
        [movedDoor],
        FLOOR_ID,
      ),
    ).toBeUndefined()
  })
})

describe('findBlockingOpeningForMove', () => {
  function makeOpening(id: number, wallId: number, offsetCm: number, widthCm: number): Opening {
    return { id, wallId, offsetCm, widthCm, type: 'door' }
  }

  const stationaryPoints = [makePoint(1, 250, -100), makePoint(2, 250, 100)]
  const stationaryWall = makeWall(10, 1, 2)
  const stationaryDoor = makeOpening(21, 10, 100, 60)
  const movedDoor = makeOpening(20, 11, 250, 100)
  const moved = [{ wallId: 11, p1: { x: 0, y: 0 }, p2: { x: 400, y: 0 } }]

  it('SABİT duvarın açıklığını kesen taşımayı yakalar (eski yön)', () => {
    expect(
      findBlockingOpeningForMove(
        moved,
        [stationaryWall],
        stationaryPoints,
        [stationaryDoor],
        FLOOR_ID,
      ),
    ).toBe(stationaryDoor)
  })

  it('TAŞINAN duvarın açıklığına giren sabit duvarı da yakalar (yeni yön)', () => {
    expect(
      findBlockingOpeningForMove(moved, [stationaryWall], stationaryPoints, [movedDoor], FLOOR_ID),
    ).toBe(movedDoor)
  })

  it('iki yön de temizse undefined döner', () => {
    const away = [{ wallId: 11, p1: { x: 0, y: 900 }, p2: { x: 400, y: 900 } }]

    expect(
      findBlockingOpeningForMove(
        away,
        [stationaryWall],
        stationaryPoints,
        [movedDoor, stationaryDoor],
        FLOOR_ID,
      ),
    ).toBeUndefined()
  })
})
