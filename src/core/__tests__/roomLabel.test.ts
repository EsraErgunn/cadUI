import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../coords'
import { getRoomLabelAnchor, isPointInsidePolygon, toSquareMetres } from '../roomLabel'

const square: PlanPoint[] = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 400 },
  { x: 0, y: 400 },
]

/**
 * L şekli: ağırlık merkezi iç köşenin boşluğuna, yani odanın DIŞINA düşer.
 * Etiket oraya yazılırsa duvarın öbür tarafında görünür.
 */
const lShape: PlanPoint[] = [
  { x: 0, y: 0 },
  { x: 600, y: 0 },
  { x: 600, y: 200 },
  { x: 200, y: 200 },
  { x: 200, y: 600 },
  { x: 0, y: 600 },
]

describe('isPointInsidePolygon', () => {
  it('içerideki noktayı bulur', () => {
    expect(isPointInsidePolygon({ x: 200, y: 200 }, square)).toBe(true)
  })

  it('dışarıdaki noktayı eler', () => {
    expect(isPointInsidePolygon({ x: 500, y: 200 }, square)).toBe(false)
  })

  it('L şeklinin oyuk kısmını DIŞARI sayar', () => {
    expect(isPointInsidePolygon({ x: 400, y: 400 }, lShape)).toBe(false)
  })
})

describe('getRoomLabelAnchor', () => {
  it('dışbükey odada ağırlık merkezini verir', () => {
    const anchor = getRoomLabelAnchor(square)

    expect(anchor.x).toBeCloseTo(200)
    expect(anchor.y).toBeCloseTo(200)
  })

  it('L şeklinde bile İÇERİDE bir nokta verir', () => {
    // Asıl mesele bu: ağırlık merkezi burada dışarı düşüyor.
    expect(isPointInsidePolygon(getRoomLabelAnchor(lShape), lShape)).toBe(true)
  })

  it('L şeklinde iç köşeye sokulmaz, kolun ferah yerine oturur', () => {
    // İç köşe (200,200); ağırlık merkezi oraya yapışıp iki satırlık etiketi
    // duvarın üstüne taşırıyordu. En geniş kolda duvara uzaklık 100 olmalı.
    const anchor = getRoomLabelAnchor(lShape)

    expect(Math.hypot(anchor.x - 200, anchor.y - 200)).toBeGreaterThan(100)
  })

  it('ince uzun odada da içeride kalır', () => {
    const corridor: PlanPoint[] = [
      { x: 0, y: 0 },
      { x: 1200, y: 0 },
      { x: 1200, y: 90 },
      { x: 0, y: 90 },
    ]

    expect(isPointInsidePolygon(getRoomLabelAnchor(corridor), corridor)).toBe(true)
  })
})

describe('toSquareMetres', () => {
  it('cm² değerini m²ye çevirir', () => {
    expect(toSquareMetres(400 * 300)).toBeCloseTo(12)
  })
})
