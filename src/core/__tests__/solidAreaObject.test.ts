import { describe, expect, it } from 'vitest'

import { getStairTreadCount } from '../areaObjectGeometry'
import type { AreaObject, AreaObjectType } from '../model'
import { buildLevelAreaObjects } from '../solidAreaObject'

const FLOOR_ID = 1
const OTHER_FLOOR_ID = 2
const level = { baseCm: 300, heightCm: 280 }

function makeAreaObject(type: AreaObjectType, overrides: Partial<AreaObject> = {}): AreaObject {
  return {
    id: 5,
    type,
    floorId: FLOOR_ID,
    x: 100,
    y: 50,
    widthCm: 120,
    lengthCm: 200,
    angleDeg: 0,
    label: 'M01',
    ...overrides,
  }
}

describe('buildLevelAreaObjects', () => {
  it('başka kattaki nesneyi almaz', () => {
    const solids = buildLevelAreaObjects(
      [makeAreaObject('structuralColumn', { floorId: OTHER_FLOOR_ID })],
      FLOOR_ID,
      level,
    )

    expect(solids.boxes).toHaveLength(0)
    expect(solids.cylinders).toHaveLength(0)
  })

  it('kolonu kat yüksekliğinde tek kutu yapar ve yerel ekseni takas eder', () => {
    const solids = buildLevelAreaObjects([makeAreaObject('structuralColumn')], FLOOR_ID, level)

    expect(solids.boxes).toHaveLength(1)
    const [box] = solids.boxes
    // Kutunun lengthCm'i three'de X, yani nesnenin YEREL genişliği; widthCm ise
    // Z, yani yerel uzunluğu. Takas edilmeseydi 120×200 boşluk 200×120 çizilirdi.
    expect(box.lengthCm).toBe(120)
    expect(box.widthCm).toBe(200)
    expect(box.heightCm).toBe(level.heightCm)
    expect(box.baseCm).toBe(level.baseCm)
  })

  it('merdiveni tek kutu değil basamak basamak kurar', () => {
    const stairs = makeAreaObject('stairs')
    const solids = buildLevelAreaObjects([stairs], FLOOR_ID, level)
    const treadCount = getStairTreadCount(stairs.lengthCm)

    expect(treadCount).toBeGreaterThan(1)
    expect(solids.boxes).toHaveLength(treadCount)
    // Her basamak kolun bir dilimi kadar derin, kolun tam genişliğinde.
    for (const box of solids.boxes) {
      expect(box.widthCm).toBeCloseTo(stairs.lengthCm / treadCount)
      expect(box.lengthCm).toBe(stairs.widthCm)
      expect(box.baseCm).toBe(level.baseCm)
    }
  })

  it('basamakları iniş yönünün TERSİNE yükseltir ve sonuncusu tavana değer', () => {
    const stairs = makeAreaObject('stairs')
    const { boxes } = buildLevelAreaObjects([stairs], FLOOR_ID, level)
    const heights = boxes.map((box) => box.heightCm)

    expect([...heights].sort((a, b) => a - b)).toEqual(heights)
    expect(heights[heights.length - 1]).toBeCloseTo(level.heightCm)
    // İniş yönü yerel −y (planda ok oraya bakıyor): en alçak basamak orada.
    expect(boxes[0].center.y).toBeLessThan(boxes[boxes.length - 1].center.y)
  })

  it('baca şaftını içi BOŞ silindir yapar', () => {
    const solids = buildLevelAreaObjects(
      [makeAreaObject('flueShaft', { widthCm: 50, lengthCm: 50 })],
      FLOOR_ID,
      level,
    )

    expect(solids.boxes).toHaveLength(0)
    expect(solids.cylinders).toHaveLength(1)
    const [cylinder] = solids.cylinders
    expect(cylinder.outerRadiusCm).toBeCloseTo(25 * 0.92)
    expect(cylinder.innerRadiusCm).toBeGreaterThan(0)
    expect(cylinder.innerRadiusCm).toBeLessThan(cylinder.outerRadiusCm)
    expect(cylinder.heightCm).toBe(level.heightCm)
    expect(cylinder.baseCm).toBe(level.baseCm)
  })

  it('kolon havalandırmasını DOLU silindir yapar, çapı plandaki çemberle aynı', () => {
    const solids = buildLevelAreaObjects(
      [makeAreaObject('columnVentilation', { widthCm: 40, lengthCm: 40 })],
      FLOOR_ID,
      level,
    )

    expect(solids.cylinders).toHaveLength(1)
    expect(solids.cylinders[0].outerRadiusCm).toBe(20)
    expect(solids.cylinders[0].innerRadiusCm).toBe(0)
  })

  it('dikdörtgen şaftta çapı KISA kenardan alır — köşeden taşmaz', () => {
    const solids = buildLevelAreaObjects(
      [makeAreaObject('columnVentilation', { widthCm: 40, lengthCm: 90 })],
      FLOOR_ID,
      level,
    )

    expect(solids.cylinders[0].outerRadiusCm).toBe(20)
  })
})
