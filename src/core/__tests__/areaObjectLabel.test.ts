import { describe, expect, it } from 'vitest'

import {
  AREA_OBJECT_LABEL_SIZE_PX,
  getAreaObjectLabelAnchorCm,
  getAreaObjectLabelOffsetCm,
  getAreaObjectNameLabel,
  getAreaObjectWorldBoundsCm,
  hasAreaObjectNameLabel,
  pickAreaObjectLabelAt,
} from '../areaObjectLabel'
import type { AreaObject } from '../model'

const FLOOR_ID = 1

function makeAreaObject(overrides: Partial<AreaObject> = {}): AreaObject {
  return {
    id: 1,
    type: 'structuralColumn',
    floorId: FLOOR_ID,
    x: 0,
    y: 0,
    widthCm: 100,
    lengthCm: 100,
    angleDeg: 0,
    label: 'K-01',
    ...overrides,
  }
}

describe('hasAreaObjectNameLabel', () => {
  it('kolon / baca şaftı / kolon havalandırmasında var, merdivende YOK', () => {
    expect(hasAreaObjectNameLabel('structuralColumn')).toBe(true)
    expect(hasAreaObjectNameLabel('flueShaft')).toBe(true)
    expect(hasAreaObjectNameLabel('columnVentilation')).toBe(true)
    // Merdivenin oku ve basamakları zaten ne olduğunu söylüyor.
    expect(hasAreaObjectNameLabel('stairs')).toBe(false)
  })
})

describe('getAreaObjectNameLabel', () => {
  it('TÜR adını verir, nesnenin kodunu değil', () => {
    expect(getAreaObjectNameLabel('structuralColumn')).toBe('Kolon')
    expect(getAreaObjectNameLabel('columnVentilation')).toBe('Kolon Havalandırması')
  })
})

describe('getAreaObjectWorldBoundsCm', () => {
  it('döndürülmüş nesnede EKSEN HİZALI kutu verir (etiket dik durduğu için)', () => {
    const rotated = makeAreaObject({ widthCm: 100, lengthCm: 100, angleDeg: 45 })

    const bounds = getAreaObjectWorldBoundsCm('structuralColumn', rotated)

    // 100×100 kare 45° dönünce köşegeni ekseni kaplar: ±70.71.
    expect(bounds.maxX).toBeCloseTo(Math.SQRT2 * 50, 4)
    expect(bounds.maxY).toBeCloseTo(Math.SQRT2 * 50, 4)
  })

  it('kolon havalandırmasında kutu ÇEMBERDEN türer, modelin alanlarından değil', () => {
    // Çap min(width, length) = 60; fazlalık uzunluk çembere girmiyor.
    const vent = makeAreaObject({ type: 'columnVentilation', widthCm: 60, lengthCm: 200 })

    const bounds = getAreaObjectWorldBoundsCm('columnVentilation', vent)

    expect(bounds.maxY).toBeCloseTo(30, 4)
  })
})

describe('getAreaObjectLabelOffsetCm', () => {
  it('kayma yoksa etiket kutunun ÜSTÜNDE, ekran payı zoom ile ölçeklenir', () => {
    const areaObject = makeAreaObject()

    const atOne = getAreaObjectLabelOffsetCm(areaObject, 1)
    const atHalf = getAreaObjectLabelOffsetCm(areaObject, 0.5)

    expect(atOne.x).toBeCloseTo(0, 6)
    // Kutunun üstü (50) + pay; uzaklaşınca (zoom 0.5) pay dünya biriminde büyür.
    expect(atOne.y).toBeGreaterThan(50)
    expect(atHalf.y).toBeGreaterThan(atOne.y)
  })

  it('kullanıcı taşıdıysa SAKLANAN kayma kullanılır', () => {
    const areaObject = makeAreaObject({ labelOffsetCm: { x: 120, y: -40 } })

    expect(getAreaObjectLabelOffsetCm(areaObject, 1)).toEqual({ x: 120, y: -40 })
  })

  it('kayma nesne merkezine göre: nesne taşınınca etiket birlikte gelir', () => {
    const moved = makeAreaObject({ x: 500, y: 300, labelOffsetCm: { x: 0, y: 80 } })

    expect(getAreaObjectLabelAnchorCm(moved, 1)).toEqual({ x: 500, y: 380 })
  })
})

describe('pickAreaObjectLabelAt', () => {
  const areaObject = makeAreaObject({ labelOffsetCm: { x: 0, y: 100 } })

  it('yazının üstünde o nesneyi verir', () => {
    expect(pickAreaObjectLabelAt({ x: 0, y: 100 }, [areaObject], FLOOR_ID, 1)?.id).toBe(1)
  })

  it('yazının uzağında undefined döner', () => {
    expect(pickAreaObjectLabelAt({ x: 0, y: 400 }, [areaObject], FLOOR_ID, 1)).toBeUndefined()
  })

  it('etiketi olmayan tür (merdiven) TUTULMAZ', () => {
    const stairs = makeAreaObject({ type: 'stairs', labelOffsetCm: { x: 0, y: 100 } })

    expect(pickAreaObjectLabelAt({ x: 0, y: 100 }, [stairs], FLOOR_ID, 1)).toBeUndefined()
  })

  it('başka kattaki nesnenin etiketi TUTULMAZ', () => {
    const other = makeAreaObject({ floorId: 2, labelOffsetCm: { x: 0, y: 100 } })

    expect(pickAreaObjectLabelAt({ x: 0, y: 100 }, [other], FLOOR_ID, 1)).toBeUndefined()
  })

  it('üst üste binen etiketlerde SON eklenen kazanır', () => {
    const older = makeAreaObject({ id: 1, labelOffsetCm: { x: 0, y: 100 } })
    const newer = makeAreaObject({ id: 2, labelOffsetCm: { x: 0, y: 100 } })

    expect(pickAreaObjectLabelAt({ x: 0, y: 100 }, [older, newer], FLOOR_ID, 1)?.id).toBe(2)
  })

  it('tutma kutusu EKRAN pikselinde: uzaklaşınca dünya kutusu büyür', () => {
    // Yazının yarım yüksekliğinin bir tık dışı — zoom 1'de ıska, zoom 0.5'te isabet.
    const justOutsideCm = AREA_OBJECT_LABEL_SIZE_PX / 2 + 4

    expect(
      pickAreaObjectLabelAt({ x: 0, y: 100 + justOutsideCm }, [areaObject], FLOOR_ID, 1),
    ).toBeUndefined()
    expect(
      pickAreaObjectLabelAt({ x: 0, y: 100 + justOutsideCm }, [areaObject], FLOOR_ID, 0.5)?.id,
    ).toBe(1)
  })
})
