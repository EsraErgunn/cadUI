import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import { getWallOutlines, getWallPolygon, getWallRenderGeometry } from '../wallShape'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, thickness: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness, height: 280 }
}

// L köşesi: yatay duvar (400 cm, kalınlık 20) + dikey duvar (300 cm, kalınlık 30).
const points = [makePoint(1, 0, 0), makePoint(2, 400, 0), makePoint(3, 400, 300)]
const horizontal = makeWall(10, 1, 2, 20)
const vertical = makeWall(11, 2, 3, 30)
const walls = [horizontal, vertical]

describe('getWallRenderGeometry', () => {
  it('komşusu olmayan duvarı olduğu gibi çizer', () => {
    expect(getWallRenderGeometry(horizontal, points, [horizontal])).toEqual({
      center: { x: 200, y: 0 },
      lengthCm: 400,
      angleDeg: 0,
    })
  })

  it('birleşen ucu komşunun yarı kalınlığı kadar uzatır', () => {
    // p2 (400,0) dikey duvarla birleşiyor (kalınlık 30) → uç 15 cm uzar.
    // Tek uç uzadığı için orta nokta da 7.5 cm kayar.
    expect(getWallRenderGeometry(horizontal, points, walls)).toEqual({
      center: { x: 207.5, y: 0 },
      lengthCm: 415,
      angleDeg: 0,
    })
  })

  it('iki ucu da birleşen duvarda orta nokta kaymaz', () => {
    const closingPoints = [...points, makePoint(4, 0, 300)]
    const left = makeWall(12, 1, 4, 30)

    expect(getWallRenderGeometry(horizontal, closingPoints, [...walls, left])).toEqual({
      center: { x: 200, y: 0 },
      lengthCm: 430,
      angleDeg: 0,
    })
  })

  it('dikey duvarın uzatmasını kendi yönünde uygular', () => {
    // p1 (400,0) yatay duvarla birleşiyor (kalınlık 20) → 10 cm geriye uzar.
    expect(getWallRenderGeometry(vertical, points, walls)).toEqual({
      center: { x: 400, y: 145 },
      lengthCm: 310,
      angleDeg: 90,
    })
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getWallRenderGeometry(makeWall(99, 1, 404, 20), points, walls)).toBeUndefined()
  })
})

describe('getWallPolygon', () => {
  it('yalnız duvarın dört köşesini verir', () => {
    // 400x20, orta çizgi y = 0 → köşeler y = ±10.
    expect(getWallPolygon(horizontal, points, [horizontal])).toEqual([
      { x: 400, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: -10 },
      { x: 400, y: -10 },
    ])
  })

  it('birleşen uçta uzatılmış köşeleri verir', () => {
    // p2 komşusu 30 kalınlığında → o uç 15 cm uzar.
    const polygon = getWallPolygon(horizontal, points, walls)
    expect(polygon?.map((point) => point.x)).toEqual([415, 0, 0, 415])
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getWallPolygon(makeWall(99, 1, 404, 20), points, walls)).toBeUndefined()
  })
})

describe('getWallOutlines', () => {
  it('duvar yoksa boş döner', () => {
    expect(getWallOutlines([], points)).toEqual([])
  })

  it('tek duvarın konturu kapalı bir dikdörtgendir', () => {
    const [ring] = getWallOutlines([horizontal], points)

    // Kapalı halka: son nokta ilkiyle aynı, dolayısıyla 4 köşe + 1 tekrar.
    expect(ring).toHaveLength(5)
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  it('köşede birleşen duvarları TEK konturda birleştirir', () => {
    // İki ayrı halka dönseydi köşede komşunun içinden geçen çizgiler görünürdü.
    expect(getWallOutlines(walls, points)).toHaveLength(1)
  })

  it('kontur duvarların dış sınırını kapsar', () => {
    const [ring] = getWallOutlines(walls, points)
    const xs = ring.map((point) => point.x)
    const ys = ring.map((point) => point.y)

    // Dikey duvar kalınlığı 30 → yatay duvar 415'e kadar uzatılmış olmalı.
    // union kayan nokta artığı bırakabiliyor, bu yüzden yaklaşık karşılaştırma.
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
