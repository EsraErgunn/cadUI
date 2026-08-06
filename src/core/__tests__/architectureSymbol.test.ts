import { describe, expect, it } from 'vitest'

import {
  getPointSymbolGeometry,
  getPointSymbolPlanGeometry,
  isPointInSymbol,
  SYMBOL_DISPLAY,
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

const WALL_THICKNESS_CM = 20
const onFace = {
  position: { x: 0, y: 0 },
  rotationDeg: 0,
  outwardSign: 1 as const,
  wallThicknessCm: WALL_THICKNESS_CM,
}

function allPoints(type: PointSymbolType) {
  const geometry = getPointSymbolGeometry(type, WALL_THICKNESS_CM)
  return [...geometry.strokes.flatMap((stroke) => stroke.points), ...geometry.fills.flat()]
}

describe('SYMBOL_DISPLAY', () => {
  it('yedi tipin de çizim tanımı var', () => {
    expect(Object.keys(SYMBOL_DISPLAY)).toHaveLength(7)
  })

  it('duvara gömülen cihazların ölçüsü referanstan', () => {
    // docs/webcad-reference.json → Panel 50×10, FireExtinguisher 26×20.
    expect(SYMBOL_DISPLAY.panel).toMatchObject({ widthCm: 50, depthCm: 10 })
    expect(SYMBOL_DISPLAY.fireExtinguisher).toMatchObject({ widthCm: 26, depthCm: 20 })
  })

  it('WebCAD"de gözlenen şekil ve yerleşimi taşır', () => {
    expect(SYMBOL_DISPLAY.panel).toMatchObject({ style: 'embedded', shape: 'filledRect' })
    expect(SYMBOL_DISPLAY.vent).toMatchObject({ style: 'embedded', shape: 'hatchedRect' })
    expect(SYMBOL_DISPLAY.mainCutoffSwitch).toMatchObject({ style: 'leader', shape: 'circle' })
    expect(SYMBOL_DISPLAY.alarmDevice).toMatchObject({ style: 'leader', shape: 'square' })
    expect(SYMBOL_DISPLAY.earthquakeSensor).toMatchObject({ style: 'leader', shape: 'square' })
    expect(SYMBOL_DISPLAY.lighting).toMatchObject({ style: 'free', shape: 'star' })
  })
})

describe('getPointSymbolGeometry', () => {
  it('her tip çizilebilir bir şey döndürür', () => {
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

  it('yalnız pano ve yangın söndürücü DOLU çizilir', () => {
    expect(getPointSymbolGeometry('panel').fills).toHaveLength(1)
    expect(getPointSymbolGeometry('fireExtinguisher').fills).toHaveLength(1)
    expect(getPointSymbolGeometry('alarmDevice').fills).toHaveLength(0)
    expect(getPointSymbolGeometry('vent').fills).toHaveLength(0)
  })

  it('menfez taralı: gövde + dikey çizgiler', () => {
    const names = getPointSymbolGeometry('vent').strokes.map((stroke) => stroke.name)

    expect(names).toContain('outline')
    expect(names.filter((name) => name.startsWith('hatch-')).length).toBeGreaterThan(2)
  })

  it('aydınlatma ışınlı yıldız', () => {
    const names = getPointSymbolGeometry('lighting').strokes.map((stroke) => stroke.name)

    expect(names.filter((name) => name.startsWith('ray-')).length).toBeGreaterThan(6)
    expect(names).toContain('hub')
  })
})

describe('gömülü cihaz duvarın İÇİNDE kalır', () => {
  it('yüzeyi aşmaz — duvarın iki tarafına taşmaz', () => {
    const ys = allPoints('panel').map((point) => point.y)

    // Yerel +y duvardan dışa: hiçbir nokta 0'ı geçmemeli.
    expect(Math.max(...ys)).toBeCloseTo(0)
    // Pano 10 derin → monte edildiği yüzden 10 cm içeri.
    expect(Math.min(...ys)).toBeCloseTo(-10)
  })

  it('menfez duvarı BAŞTAN SONA geçer — delik, kutu değil', () => {
    const ys = allPoints('vent').map((point) => point.y)

    expect(Math.max(...ys)).toBeCloseTo(0)
    expect(Math.min(...ys)).toBeCloseTo(-WALL_THICKNESS_CM)
  })

  it('menfez ince duvarda da tam kalınlığı kaplar', () => {
    const thin = getPointSymbolGeometry('vent', 8)
    const ys = thin.strokes.flatMap((stroke) => stroke.points).map((point) => point.y)

    expect(Math.min(...ys)).toBeCloseTo(-8)
  })

  it('duvardan kalın cihaz duvara sığdırılır', () => {
    // Yangın söndürücü 20 derin; 12 cm duvarda taşmamalı.
    const ys = getPointSymbolGeometry('fireExtinguisher', 12)
      .strokes.flatMap((stroke) => stroke.points)
      .map((point) => point.y)

    expect(Math.min(...ys)).toBeCloseTo(-12)
    expect(Math.max(...ys)).toBeCloseTo(0)
  })

  it('çekme çizgisi YOK', () => {
    const names = getPointSymbolGeometry('panel', WALL_THICKNESS_CM).strokes.map(
      (stroke) => stroke.name,
    )
    expect(names).not.toContain('leader')
  })
})

describe('çekme çizgili cihaz duvarın DIŞINDA durur', () => {
  it('işaret yüzeyden uzakta, arada çizgi var', () => {
    const geometry = getPointSymbolGeometry('alarmDevice')
    const names = geometry.strokes.map((stroke) => stroke.name)

    expect(names).toContain('leader')

    const marker = geometry.strokes.find((stroke) => stroke.name === 'outline')!
    const ys = marker.points.map((point) => point.y)
    // İşaretin tamamı duvar yüzünün (y=0) dışında.
    expect(Math.min(...ys)).toBeGreaterThan(0)
  })

  it('çekme çizgisi yüzeyden işarete uzanır', () => {
    const leader = getPointSymbolGeometry('mainCutoffSwitch').strokes.find(
      (stroke) => stroke.name === 'leader',
    )!

    expect(leader.points[0]).toEqual({ x: 0, y: 0 })
    expect(leader.points[1].y).toBeGreaterThan(0)
  })
})

describe('toPlanPoints', () => {
  it('geometri ÖLÇEKLENMEZ — zaten santimetrede', () => {
    expect(toPlanPoints(onFace, [{ x: 25, y: 0 }])[0].x).toBeCloseTo(25)
  })

  it('sembolün konumuna taşır', () => {
    const [moved] = toPlanPoints(
      { position: { x: 300, y: 120 }, rotationDeg: 0, outwardSign: 1, wallThicknessCm: 20 },
      [{ x: 0, y: 0 }],
    )

    expect(moved).toEqual({ x: 300, y: 120 })
  })

  it('duvarın açısı kadar döndürür', () => {
    const [moved] = toPlanPoints(
      { position: { x: 0, y: 0 }, rotationDeg: 90, outwardSign: 1, wallThicknessCm: 20 },
      [{ x: 25, y: 0 }],
    )

    expect(moved.x).toBeCloseTo(0)
    expect(moved.y).toBeCloseTo(25)
  })

  it('ters yüzde işaret duvarın ÖTEKİ tarafına gider', () => {
    const local = [{ x: 0, y: 50 }]
    const far = toPlanPoints({ ...onFace, outwardSign: 1 }, local)[0]
    const near = toPlanPoints({ ...onFace, outwardSign: -1 }, local)[0]

    expect(far.y).toBeCloseTo(50)
    expect(near.y).toBeCloseTo(-50)
  })
})

describe('getPointSymbolPlanGeometry', () => {
  it('çekme çizgili cihaz duvarın dışına, yüzün doğru tarafına çizilir', () => {
    const geometry = getPointSymbolPlanGeometry('alarmDevice', {
      position: { x: 100, y: 0 },
      rotationDeg: 0,
      outwardSign: -1,
      wallThicknessCm: 20,
    })
    const ys = geometry.strokes.flatMap((stroke) => stroke.points).map((point) => point.y)

    // outwardSign -1 → her şey y ekseninin altında.
    expect(Math.max(...ys)).toBeLessThanOrEqual(0)
  })
})

describe('isPointInSymbol', () => {
  const position = { x: 200, y: 100 }

  it('gömülü cihazda erişim ölçüsüne göre değişir', () => {
    // Pano 50 geniş (yarısı 25), alarm işareti daha uzakta.
    expect(isPointInSymbol({ x: 222, y: 100 }, position, 0, 'panel')).toBe(true)
    expect(isPointInSymbol({ x: 260, y: 100 }, position, 0, 'panel')).toBe(false)
  })

  it('çekme çizgili cihazda İŞARET de tutulabilir', () => {
    // İşaret duvardan ~45 cm uzakta; kullanıcı gördüğü kutuya basar.
    expect(isPointInSymbol({ x: 200, y: 150 }, position, 0, 'alarmDevice')).toBe(true)
    expect(isPointInSymbol({ x: 200, y: 150 }, position, 0, 'panel')).toBe(false)
  })

  it('uzaktaki imleç hiçbirinin üstünde değil', () => {
    expect(isPointInSymbol({ x: 500, y: 100 }, position, 5, 'alarmDevice')).toBe(false)
  })
})
