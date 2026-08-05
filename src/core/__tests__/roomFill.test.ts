import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../coords'
import { insetRoomPolygon, triangulatePolygon } from '../roomFill'
import { isPointInsidePolygon } from '../roomLabel'

/** Saat yönünün tersinde 400×300 dikdörtgen. */
const RECTANGLE: PlanPoint[] = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 300 },
  { x: 0, y: 300 },
]

/**
 * L şeklinde oda: sağ üst köşesi kesilmiş 400×400 kare. (400,200)-(200,200)-(200,400)
 * içbükey kısmı oluşturur — yelpaze üçgenlemesi burada dışarı taşıyordu.
 */
const L_SHAPE: PlanPoint[] = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 200 },
  { x: 200, y: 200 },
  { x: 200, y: 400 },
  { x: 0, y: 400 },
]

function getPolygonArea(corners: readonly PlanPoint[]): number {
  let total = 0
  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index]
    const next = corners[(index + 1) % corners.length]
    total += current.x * next.y - next.x * current.y
  }
  return Math.abs(total) / 2
}

function getTrianglesArea(triangleCorners: readonly PlanPoint[]): number {
  let total = 0
  for (let index = 0; index < triangleCorners.length; index += 3) {
    total += getPolygonArea(triangleCorners.slice(index, index + 3))
  }
  return total
}

function getTriangleCentroid(triangle: readonly PlanPoint[]): PlanPoint {
  return {
    x: (triangle[0].x + triangle[1].x + triangle[2].x) / 3,
    y: (triangle[0].y + triangle[1].y + triangle[2].y) / 3,
  }
}

describe('triangulatePolygon', () => {
  it('dikdörtgeni iki üçgene ayırır', () => {
    const triangles = triangulatePolygon(RECTANGLE)

    expect(triangles).toHaveLength(6)
    expect(getTrianglesArea(triangles)).toBeCloseTo(120_000, 6)
  })

  it('n köşe için n-2 üçgen üretir', () => {
    expect(triangulatePolygon(L_SHAPE)).toHaveLength((L_SHAPE.length - 2) * 3)
  })

  it('L şeklinde odada üçgenlerin toplam alanı poligonun alanına eşit', () => {
    // Taşma olsaydı toplam alan poligonunkini aşardı.
    expect(getTrianglesArea(triangulatePolygon(L_SHAPE))).toBeCloseTo(getPolygonArea(L_SHAPE), 6)
  })

  it('L şeklinde odada hiçbir üçgen poligonun dışına düşmez', () => {
    const triangles = triangulatePolygon(L_SHAPE)

    for (let index = 0; index < triangles.length; index += 3) {
      const centroid = getTriangleCentroid(triangles.slice(index, index + 3))
      expect(isPointInsidePolygon(centroid, L_SHAPE)).toBe(true)
    }
  })

  it('saat yönünde verilen poligonu da doğru üçgenler', () => {
    const clockwise = [...L_SHAPE].reverse()

    expect(getTrianglesArea(triangulatePolygon(clockwise))).toBeCloseTo(getPolygonArea(L_SHAPE), 6)
  })

  it('üç köşeden azını üçgenlemez', () => {
    expect(triangulatePolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toEqual([])
  })
})

describe('insetRoomPolygon', () => {
  it('dikdörtgeni her kenardan duvar kalınlığının yarısı kadar içeri çeker', () => {
    const inset = insetRoomPolygon(RECTANGLE, [20, 20, 20, 20])

    expect(inset).toEqual([
      { x: 10, y: 10 },
      { x: 390, y: 10 },
      { x: 390, y: 290 },
      { x: 10, y: 290 },
    ])
  })

  it('kenarları kendi duvarının kalınlığına göre çeker', () => {
    const inset = insetRoomPolygon(RECTANGLE, [20, 40, 20, 10])

    // Sol kenar 10'luk duvar (5), alt kenar 20'lik duvar (10) → (5, 10).
    expect(inset?.[0]).toEqual({ x: 5, y: 10 })
    // Sağ kenar 40'lık duvar → 400 - 20.
    expect(inset?.[1]).toEqual({ x: 380, y: 10 })
  })

  it('içbükey köşeyi dışarı doğru açar — L odada dolgu iç yüzü izler', () => {
    const inset = insetRoomPolygon(L_SHAPE, [20, 20, 20, 20, 20, 20])

    expect(inset).toEqual([
      { x: 10, y: 10 },
      { x: 390, y: 10 },
      { x: 390, y: 190 },
      { x: 190, y: 190 },
      { x: 190, y: 390 },
      { x: 10, y: 390 },
    ])
  })

  it('küçülen poligon hâlâ orijinalin içinde kalır', () => {
    const inset = insetRoomPolygon(L_SHAPE, [20, 20, 20, 20, 20, 20]) ?? []

    for (const corner of inset) {
      expect(isPointInsidePolygon(corner, L_SHAPE)).toBe(true)
    }
  })

  it('saat yönünde verilen poligonu da içeri çeker, dışarı değil', () => {
    const clockwise = [...RECTANGLE].reverse()
    const inset = insetRoomPolygon(clockwise, [20, 20, 20, 20]) ?? []

    for (const corner of inset) {
      expect(isPointInsidePolygon(corner, RECTANGLE)).toBe(true)
    }
  })

  it('oda duvarlarından inceyse dolgu poligonu yoktur', () => {
    const narrow: PlanPoint[] = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 10 },
      { x: 0, y: 10 },
    ]

    expect(insetRoomPolygon(narrow, [30, 30, 30, 30])).toBeUndefined()
  })

  it('kalınlık sayısı kenar sayısıyla uyuşmazsa hesaplamaz', () => {
    expect(insetRoomPolygon(RECTANGLE, [20, 20])).toBeUndefined()
  })

  it('üç köşeden azında hesaplamaz', () => {
    expect(insetRoomPolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }], [20, 20])).toBeUndefined()
  })
})
