import { describe, expect, it } from 'vitest'

import {
  getPointSymbolGeometry,
  getPointSymbolPlanGeometry,
  isPointInSymbol,
  SYMBOL_FOOTPRINTS_CM,
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

const atOrigin = { position: { x: 0, y: 0 }, rotationDeg: 0 }

describe('SYMBOL_FOOTPRINTS_CM', () => {
  it('yedi tipin de ölçüsü var', () => {
    expect(Object.keys(SYMBOL_FOOTPRINTS_CM)).toHaveLength(7)
  })

  it('referanstaki cihaz ölçülerini taşır', () => {
    // docs/webcad-reference.json → Panel width 50 / depth 10, Alarm 20 / 20.
    expect(SYMBOL_FOOTPRINTS_CM.panel).toEqual({ widthCm: 50, depthCm: 10 })
    expect(SYMBOL_FOOTPRINTS_CM.alarmDevice).toEqual({ widthCm: 20, depthCm: 20 })
    expect(SYMBOL_FOOTPRINTS_CM.fireExtinguisher).toEqual({ widthCm: 26, depthCm: 20 })
  })

  it('cihazlar AYNI boyda değil — sabit kare olsaydı oranlar yanlış olurdu', () => {
    expect(SYMBOL_FOOTPRINTS_CM.panel.widthCm).not.toBe(SYMBOL_FOOTPRINTS_CM.alarmDevice.widthCm)
  })
})

describe('getPointSymbolGeometry', () => {
  it('her tip kapalı bir dikdörtgen döndürür', () => {
    for (const type of ALL_TYPES) {
      const geometry = getPointSymbolGeometry(type)

      expect(geometry.strokes).toHaveLength(1)
      // Kapalı halka: 4 köşe + başlangıca dönüş.
      expect(geometry.strokes[0].points).toHaveLength(5)
      expect(geometry.fills).toHaveLength(1)
      expect(geometry.fills[0]).toHaveLength(4)
    }
  })

  it('dikdörtgen ölçü tablosundaki boyda ve merkezde', () => {
    const { strokes } = getPointSymbolGeometry('panel')
    const xs = strokes[0].points.map((point) => point.x)
    const ys = strokes[0].points.map((point) => point.y)

    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(50)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(10)
    // Merkez orijinde.
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(0)
  })

  it('genişlik duvar boyunca (+x), derinlik duvara dik (+y)', () => {
    // Alarm 20×20 kare, pano 50×10 — panoda x ekseni daha uzun olmalı.
    const { strokes } = getPointSymbolGeometry('panel')
    const xs = strokes[0].points.map((point) => point.x)
    const ys = strokes[0].points.map((point) => point.y)

    expect(Math.max(...xs)).toBeGreaterThan(Math.max(...ys))
  })
})

describe('toPlanPoints', () => {
  it('geometri ÖLÇEKLENMEZ — zaten santimetrede', () => {
    const [moved] = toPlanPoints(atOrigin, [{ x: 25, y: 0 }])

    expect(moved.x).toBeCloseTo(25)
  })

  it('sembolün konumuna taşır', () => {
    const [moved] = toPlanPoints({ position: { x: 300, y: 120 }, rotationDeg: 0 }, [
      { x: 0, y: 0 },
    ])

    expect(moved).toEqual({ x: 300, y: 120 })
  })

  it('sembolün açısı kadar döndürür', () => {
    const [moved] = toPlanPoints({ position: { x: 0, y: 0 }, rotationDeg: 90 }, [{ x: 25, y: 0 }])

    expect(moved.x).toBeCloseTo(0)
    expect(moved.y).toBeCloseTo(25)
  })

  it('döndürme sembolün MERKEZİ etrafındadır — konum değişmez', () => {
    const pose = { position: { x: 250, y: 400 }, rotationDeg: 37 }
    const [center] = toPlanPoints(pose, [{ x: 0, y: 0 }])

    expect(center.x).toBeCloseTo(250)
    expect(center.y).toBeCloseTo(400)
  })
})

describe('getPointSymbolPlanGeometry', () => {
  it('çizgileri ve dolguyu birlikte çevirir', () => {
    const geometry = getPointSymbolPlanGeometry('panel', {
      position: { x: 100, y: 100 },
      rotationDeg: 0,
    })

    expect(geometry.strokes).toHaveLength(1)
    expect(geometry.fills).toHaveLength(1)
    // Pano 50 geniş → x, merkezden ±25.
    const xs = geometry.strokes[0].points.map((point) => point.x)
    expect(Math.min(...xs)).toBeCloseTo(75)
    expect(Math.max(...xs)).toBeCloseTo(125)
  })

  it('duvar açısıyla birlikte döner', () => {
    const geometry = getPointSymbolPlanGeometry('panel', {
      position: { x: 0, y: 0 },
      rotationDeg: 90,
    })

    // 90° dönünce genişlik y eksenine geçer.
    const ys = geometry.strokes[0].points.map((point) => point.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(50)
  })
})

describe('isPointInSymbol', () => {
  const position = { x: 200, y: 100 }

  it('merkezdeki imleç sembolün üstündedir', () => {
    expect(isPointInSymbol({ x: 200, y: 100 }, position, 0, 'panel')).toBe(true)
  })

  it('erişim mesafesi cihazın ÖLÇÜSÜNE göre değişir', () => {
    // Pano 50 geniş (yarısı 25), alarm 20 (yarısı 10).
    expect(isPointInSymbol({ x: 222, y: 100 }, position, 0, 'panel')).toBe(true)
    expect(isPointInSymbol({ x: 222, y: 100 }, position, 0, 'alarmDevice')).toBe(false)
  })

  it('tolerans kenarın hemen dışını yakalar', () => {
    expect(isPointInSymbol({ x: 228, y: 100 }, position, 5, 'panel')).toBe(true)
    expect(isPointInSymbol({ x: 228, y: 100 }, position, 0, 'panel')).toBe(false)
  })

  it('uzaktaki imleç sembolün üstünde değildir', () => {
    expect(isPointInSymbol({ x: 400, y: 100 }, position, 5, 'panel')).toBe(false)
  })
})
