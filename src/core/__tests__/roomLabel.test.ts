import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../coords'
import { getRoomLabelBounds, isPointInRoomLabel, getRoomLabelAnchor, isPointInsidePolygon, toSquareMetres } from '../roomLabel'

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

describe('isPointInRoomLabel', () => {
  const anchor = { x: 100, y: 200 }
  const name = 'SALON'

  it('çapanın kendisi rozetin içinde', () => {
    expect(isPointInRoomLabel(anchor, anchor, name)).toBe(true)
  })

  it('kutu çapanın hem ÜSTÜNÜ hem ALTINI kapsar: ad üstte, alan satırı altta', () => {
    const { aboveCm, belowCm } = getRoomLabelBounds(name)

    expect(isPointInRoomLabel({ x: 100, y: 200 + aboveCm - 1 }, anchor, name)).toBe(true)
    expect(isPointInRoomLabel({ x: 100, y: 200 - belowCm + 1 }, anchor, name)).toBe(true)
  })

  it('rozetin KENARI hâlâ içeride — hatanın çıktığı yer burasıydı', () => {
    const { halfWidthCm } = getRoomLabelBounds(name)

    expect(isPointInRoomLabel({ x: 100 + halfWidthCm - 1, y: 200 }, anchor, name)).toBe(true)
    expect(isPointInRoomLabel({ x: 100 - halfWidthCm + 1, y: 200 }, anchor, name)).toBe(true)
  })

  it('kutunun dışı dışarıda', () => {
    const { halfWidthCm, aboveCm } = getRoomLabelBounds(name)

    expect(isPointInRoomLabel({ x: 100 + halfWidthCm + 5, y: 200 }, anchor, name)).toBe(false)
    expect(isPointInRoomLabel({ x: 100, y: 200 + aboveCm + 5 }, anchor, name)).toBe(false)
  })

  it('uzun ad kutuyu genişletir', () => {
    const short = getRoomLabelBounds('WC').halfWidthCm
    const long = getRoomLabelBounds('MUTFAK VE YEMEK ODASI').halfWidthCm

    expect(long).toBeGreaterThan(short)
  })

  it('kısa adda bile alan satırı kadar geniş kalır', () => {
    // Rozet iki satırın BÜYÜĞÜNDEN büyür; "WC" dar diye kutu daralmamalı.
    expect(getRoomLabelBounds('WC').halfWidthCm).toBeGreaterThan(50)
  })
})
