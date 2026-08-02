import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../coords'
import type { Point, Wall } from '../model'
import { getWallOutlines, getWallPolygon } from '../wallShape'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, thickness: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness, height: 280 }
}

function round(polygon: readonly PlanPoint[]): PlanPoint[] {
  return polygon.map((corner) => ({
    x: Math.round(corner.x * 100) / 100,
    y: Math.round(corner.y * 100) / 100,
  }))
}

// L köşesi: yatay duvar (400 cm, kalınlık 20) + dikey duvar (300 cm, kalınlık 30).
const points = [makePoint(1, 0, 0), makePoint(2, 400, 0), makePoint(3, 400, 300)]
const horizontal = makeWall(10, 1, 2, 20)
const vertical = makeWall(11, 2, 3, 30)
const walls = [horizontal, vertical]

describe('getWallPolygon — komşusuz uç', () => {
  it('düz kesilmiş dikdörtgen verir', () => {
    // Sıra: p1-sol, p1-sağ, p2-sağ, p2-sol.
    expect(getWallPolygon(horizontal, points, [horizontal])).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: -10 },
      { x: 400, y: -10 },
      { x: 400, y: 10 },
    ])
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getWallPolygon(makeWall(99, 1, 404, 20), points, walls)).toBeUndefined()
  })

  it('sıfır boylu duvarda undefined döner', () => {
    const samePlace = [makePoint(1, 0, 0), makePoint(2, 0, 0)]
    expect(getWallPolygon(makeWall(10, 1, 2, 20), samePlace, [])).toBeUndefined()
  })
})

describe('getWallPolygon — dik birleşim', () => {
  it('köşeyi iki duvarın kenar çizgilerinin kesişimine taşır', () => {
    // Dikey duvar 30 kalın → kenarları x = 385 ve x = 415.
    // Yatay duvarın p2 köşeleri bu kenarlara oturur, 400'de kesilmez.
    expect(getWallPolygon(horizontal, points, walls)).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: -10 },
      { x: 415, y: -10 },
      { x: 385, y: 10 },
    ])
  })

  it('komşu duvarın köşeleri aynı noktalarda buluşur', () => {
    // Yatay duvar 20 kalın → kenarları y = -10 ve y = 10.
    expect(getWallPolygon(vertical, points, walls)).toEqual([
      { x: 385, y: 10 },
      { x: 415, y: -10 },
      { x: 415, y: 300 },
      { x: 385, y: 300 },
    ])
  })
})

describe('getWallPolygon — dar açı (asıl sorun)', () => {
  // 30°'lik dar köşe: (0,0)'dan doğuya ve 30° yukarı iki duvar.
  const acutePoints = [
    makePoint(1, 0, 0),
    makePoint(2, 400, 0),
    makePoint(3, 400 * Math.cos(Math.PI / 6), 400 * Math.sin(Math.PI / 6)),
  ]
  const east = makeWall(10, 1, 2, 20)
  const upward = makeWall(11, 1, 3, 20)
  const acuteWalls = [east, upward]

  it('dar köşede iki duvarın kenarları AYNI noktada buluşur', () => {
    const eastPolygon = round(getWallPolygon(east, acutePoints, acuteWalls) ?? [])
    const upwardPolygon = round(getWallPolygon(upward, acutePoints, acuteWalls) ?? [])

    // Ortak köşe (0,0): iki duvarın p1 köşeleri çakışmalı, yoksa testere dişi kalır.
    expect(eastPolygon[0]).toEqual(upwardPolygon[1])
    expect(eastPolygon[1]).toEqual(upwardPolygon[0])
  })

  it('gönye ucu köşeden dışarı taşar ama sınırı aşmaz', () => {
    const [, outerCorner] = getWallPolygon(east, acutePoints, acuteWalls) ?? []
    const distanceCm = Math.hypot(outerCorner.x, outerCorner.y)

    // Dik açıda 10 cm olurdu; dar açıda uzuyor ama 4 × yarı kalınlık = 40 ile sınırlı.
    expect(distanceCm).toBeGreaterThan(10)
    expect(distanceCm).toBeLessThanOrEqual(40)
  })

  it('çok dar açıda uç kısaltılır (pah)', () => {
    // 5°: gönye ~229 cm olurdu, sınır 40 cm.
    const sharpPoints = [
      makePoint(1, 0, 0),
      makePoint(2, 400, 0),
      makePoint(3, 400 * Math.cos(Math.PI / 36), 400 * Math.sin(Math.PI / 36)),
    ]
    const sharpWalls = [east, makeWall(11, 1, 3, 20)]
    const [, outerCorner] = getWallPolygon(east, sharpPoints, sharpWalls) ?? []

    expect(Math.hypot(outerCorner.x, outerCorner.y)).toBeCloseTo(40)
  })
})

describe('getWallPolygon — gönye uygulanmayan durumlar', () => {
  it('üç duvarın birleştiği köşede gönye yapmaz', () => {
    // Tek bir kesişim tanımlı değil; uç düz kesilir.
    const tPoints = [...points, makePoint(4, 400, -300)]
    const third = makeWall(12, 2, 4, 20)
    const polygon = getWallPolygon(horizontal, points.concat(tPoints.slice(3)), [
      ...walls,
      third,
    ])

    expect(polygon?.[2]).toEqual({ x: 400, y: -10 })
    expect(polygon?.[3]).toEqual({ x: 400, y: 10 })
  })

  it('düz devam eden komşuda (paralel kenarlar) uç düz kalır', () => {
    const straightPoints = [makePoint(1, 0, 0), makePoint(2, 400, 0), makePoint(3, 800, 0)]
    const first = makeWall(10, 1, 2, 20)
    const second = makeWall(11, 2, 3, 20)
    const polygon = getWallPolygon(first, straightPoints, [first, second])

    expect(polygon?.[2]).toEqual({ x: 400, y: -10 })
    expect(polygon?.[3]).toEqual({ x: 400, y: 10 })
  })

  it('başka kattaki komşuyu hesaba katmaz', () => {
    const otherFloorWall = { id: 11, floorId: 2, p1Id: 2, p2Id: 3, thickness: 30, height: 280 }
    const polygon = getWallPolygon(horizontal, points, [horizontal, otherFloorWall])

    expect(polygon?.[2]).toEqual({ x: 400, y: -10 })
  })
})

describe('getWallOutlines', () => {
  it('duvar yoksa boş döner', () => {
    expect(getWallOutlines([], points)).toEqual([])
  })

  it('tek duvarın konturu kapalı bir dikdörtgendir', () => {
    const [ring] = getWallOutlines([horizontal], points)

    expect(ring).toHaveLength(5)
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  it('köşede birleşen duvarları TEK konturda birleştirir', () => {
    expect(getWallOutlines(walls, points)).toHaveLength(1)
  })

  it('kontur duvarların dış sınırını kapsar', () => {
    const [ring] = getWallOutlines(walls, points)
    const xs = ring.map((corner) => corner.x)
    const ys = ring.map((corner) => corner.y)

    expect(Math.min(...xs)).toBeCloseTo(0)
    expect(Math.max(...xs)).toBeCloseTo(415)
    expect(Math.min(...ys)).toBeCloseTo(-10)
    expect(Math.max(...ys)).toBeCloseTo(300)
  })

  it('ayrık duvarlar için ayrı konturlar döner', () => {
    const farPoints = [...points, makePoint(4, 2000, 0), makePoint(5, 2400, 0)]
    const far = makeWall(12, 4, 5, 20)

    expect(getWallOutlines([horizontal, far], farPoints)).toHaveLength(2)
  })
})
