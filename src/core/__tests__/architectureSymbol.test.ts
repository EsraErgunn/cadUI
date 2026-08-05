import { describe, expect, it } from 'vitest'

import {
  getPointSymbolGeometry,
  getPointSymbolPlanGeometry,
  isPointInSymbol,
  POINT_SYMBOL_SIZE_CM,
  toPlanPoints,
} from '../architectureSymbol'
import type { PointSymbolType } from '../model'

const ALL_TYPES: PointSymbolType[] = [
  'mainCutoffSwitch',
  'panel',
  'lighting',
  'fireExtinguisher',
  'alarmDevice',
  'earthquakeSensor',
  'vent',
]

const atOrigin = { x: 0, y: 0, rotationDeg: 0 }

describe('getPointSymbolGeometry', () => {
  it('yedi tipin hepsi çizilebilir bir şekil döndürür', () => {
    for (const type of ALL_TYPES) {
      const geometry = getPointSymbolGeometry(type)
      expect(geometry.strokes.length).toBeGreaterThan(0)
      for (const stroke of geometry.strokes) {
        expect(stroke.points.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('çizgi adları sembol içinde tekil — React key olarak kullanılıyor', () => {
    for (const type of ALL_TYPES) {
      const names = getPointSymbolGeometry(type).strokes.map((stroke) => stroke.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('şekiller birim çerçeveyi taşmaz', () => {
    for (const type of ALL_TYPES) {
      const geometry = getPointSymbolGeometry(type)
      const points = [...geometry.strokes.flatMap((stroke) => stroke.points), ...geometry.fills.flat()]

      for (const point of points) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(50)
        expect(Math.abs(point.y)).toBeLessThanOrEqual(50)
      }
    }
  })
})

describe('toPlanPoints', () => {
  it('birim çerçeveyi sembol boyuna ölçekler', () => {
    // Birim çerçevede kenar 100 → sağ kenar 50; 40 cm boyda 20 cm.
    const [moved] = toPlanPoints(atOrigin, [{ x: 50, y: 0 }])

    expect(moved.x).toBeCloseTo(POINT_SYMBOL_SIZE_CM / 2)
    expect(moved.y).toBeCloseTo(0)
  })

  it('sembolün konumuna taşır', () => {
    const [moved] = toPlanPoints({ x: 300, y: 120, rotationDeg: 0 }, [{ x: 0, y: 0 }])

    expect(moved).toEqual({ x: 300, y: 120 })
  })

  it('sembolün açısı kadar döndürür', () => {
    const [moved] = toPlanPoints({ x: 0, y: 0, rotationDeg: 90 }, [{ x: 50, y: 0 }])

    expect(moved.x).toBeCloseTo(0)
    expect(moved.y).toBeCloseTo(POINT_SYMBOL_SIZE_CM / 2)
  })

  it('döndürme sembolün MERKEZİ etrafındadır — konum değişmez', () => {
    const symbol = { x: 250, y: 400, rotationDeg: 37 }
    const [center] = toPlanPoints(symbol, [{ x: 0, y: 0 }])

    expect(center.x).toBeCloseTo(250)
    expect(center.y).toBeCloseTo(400)
  })

  it('boy verilince ona göre ölçekler', () => {
    const [moved] = toPlanPoints(atOrigin, [{ x: 50, y: 0 }], 100)

    expect(moved.x).toBeCloseTo(50)
  })
})

describe('getPointSymbolPlanGeometry', () => {
  it('çizgileri ve dolguları birlikte çevirir', () => {
    const geometry = getPointSymbolPlanGeometry({
      type: 'panel',
      x: 100,
      y: 100,
      rotationDeg: 0,
    })

    expect(geometry.strokes.length).toBeGreaterThan(0)
    // Pano dolu üst şerit taşır.
    expect(geometry.fills.length).toBe(1)

    for (const point of geometry.strokes[0].points) {
      expect(Math.abs(point.x - 100)).toBeLessThanOrEqual(POINT_SYMBOL_SIZE_CM)
      expect(Math.abs(point.y - 100)).toBeLessThanOrEqual(POINT_SYMBOL_SIZE_CM)
    }
  })

  it('çizgi adları çevrimden sonra korunur', () => {
    const geometry = getPointSymbolPlanGeometry({
      type: 'vent',
      x: 0,
      y: 0,
      rotationDeg: 0,
    })

    expect(geometry.strokes.map((stroke) => stroke.name)).toContain('body')
  })
})

describe('isPointInSymbol', () => {
  const symbol = { x: 200, y: 100 }
  const half = POINT_SYMBOL_SIZE_CM / 2

  it('merkezdeki imleç sembolün üstündedir', () => {
    expect(isPointInSymbol({ x: 200, y: 100 }, symbol, 0)).toBe(true)
  })

  it('kenarın hemen dışı toleransla yakalanır', () => {
    expect(isPointInSymbol({ x: 200 + half + 3, y: 100 }, symbol, 5)).toBe(true)
    expect(isPointInSymbol({ x: 200 + half + 3, y: 100 }, symbol, 0)).toBe(false)
  })

  it('uzaktaki imleç sembolün üstünde değildir', () => {
    expect(isPointInSymbol({ x: 400, y: 100 }, symbol, 5)).toBe(false)
  })
})
