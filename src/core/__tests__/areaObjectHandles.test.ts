import { describe, expect, it } from 'vitest'

import { MIN_AREA_OBJECT_SIZE_CM } from '../areaObject'
import {
  findAreaObjectHandleAt,
  getAreaObjectAngleFromPointer,
  getAreaObjectHandleLayout,
  getAreaObjectLocalBounds,
  HANDLE_HIT_PX,
  resizeAreaObjectFromCorner,
} from '../areaObjectHandles'
import type { AreaObject } from '../model'

const FLOOR_ID = 1
/** Zoom 1 = 1 cm başına 1 piksel; testlerde px ↔ cm birebir okunsun. */
const ZOOM = 1

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

describe('getAreaObjectLocalBounds', () => {
  it('dikdörtgen tipte kutu tam olarak genişlik × uzunluk', () => {
    const bounds = getAreaObjectLocalBounds(
      'structuralColumn',
      makeAreaObject({ widthCm: 120, lengthCm: 80 }),
    )

    expect(bounds).toEqual({ minX: -60, minY: -40, maxX: 60, maxY: 40 })
  })

  it('daire olan kolon havalandırmasında kutu ÇİZİLEN dairenin sınırı', () => {
    // Çap min(width, length) — kutu modelin 120'sine değil dairenin 80'ine oturur.
    const bounds = getAreaObjectLocalBounds(
      'columnVentilation',
      makeAreaObject({ widthCm: 120, lengthCm: 80 }),
    )

    expect(bounds.maxX).toBeCloseTo(40, 5)
    expect(bounds.maxY).toBeCloseTo(40, 5)
    expect(bounds.minX).toBeCloseTo(-40, 5)
  })

  it('merdivenin basamak/ok çizgileri kutuyu taşırmaz', () => {
    const bounds = getAreaObjectLocalBounds(
      'stairs',
      makeAreaObject({ widthCm: 120, lengthCm: 200 }),
    )

    expect(bounds).toEqual({ minX: -60, minY: -100, maxX: 60, maxY: 100 })
  })
})

describe('getAreaObjectHandleLayout', () => {
  it('döndürme ikonu kutunun ÜST-ORTA noktasının dışında durur', () => {
    const layout = getAreaObjectHandleLayout('structuralColumn', makeAreaObject(), ZOOM)

    expect(layout.rotate.x).toBeCloseTo(0, 5)
    // Kutunun üst kenarı +50; ikon onun da dışında.
    expect(layout.rotate.y).toBeGreaterThan(50)
  })

  it('boyutlandırma ikonu kutunun SAĞ-ALT köşesinin dışında durur', () => {
    const layout = getAreaObjectHandleLayout('structuralColumn', makeAreaObject(), ZOOM)

    // Ekranda +y yukarı (Cameras.tsx): sağ-alt = (+x, −y).
    expect(layout.resize.x).toBeGreaterThan(50)
    expect(layout.resize.y).toBeLessThan(-50)
  })

  it('sabit köşe kutunun SOL-ÜSTÜ — resize orayı çakılı tutar', () => {
    const layout = getAreaObjectHandleLayout('structuralColumn', makeAreaObject(), ZOOM)

    expect(layout.fixedCorner).toEqual({ x: -50, y: 50 })
  })

  it('ikonların kutuya uzaklığı EKRAN pikselinde sabit — zoom ile ters ölçeklenir', () => {
    const object = makeAreaObject()
    const near = getAreaObjectHandleLayout('structuralColumn', object, 1)
    const far = getAreaObjectHandleLayout('structuralColumn', object, 2)

    // Zoom iki katına çıkınca aynı piksel payı YARI dünya birimi eder.
    expect(near.rotate.y - 50).toBeCloseTo((far.rotate.y - 50) * 2, 5)
  })

  it('kutu nesneyle birlikte DÖNER (eksen hizalı değil)', () => {
    const layout = getAreaObjectHandleLayout(
      'structuralColumn',
      makeAreaObject({ angleDeg: 90 }),
      ZOOM,
    )

    // 90° dönünce "üst" ekranda sola bakar.
    expect(layout.rotate.x).toBeLessThan(-50)
    expect(layout.rotate.y).toBeCloseTo(0, 5)
  })
})

describe('findAreaObjectHandleAt', () => {
  const object = makeAreaObject()
  const layout = getAreaObjectHandleLayout('structuralColumn', object, ZOOM)

  it('ikonun üstündeyken onu verir', () => {
    expect(findAreaObjectHandleAt(layout.resize, 'structuralColumn', object, ZOOM)).toBe('resize')
    expect(findAreaObjectHandleAt(layout.rotate, 'structuralColumn', object, ZOOM)).toBe('rotate')
  })

  it('ikonlardan uzakta undefined döner', () => {
    expect(findAreaObjectHandleAt({ x: 0, y: 0 }, 'structuralColumn', object, ZOOM)).toBeUndefined()
  })

  it('tutma alanı EKRAN pikselinde sabit: uzaklaşınca dünya karşılığı büyür', () => {
    // Zoom 1'de erişim yarıçapı HANDLE_HIT_PX/2 cm; onun bir tık dışı ıskalar.
    const justOutside = {
      x: layout.resize.x + HANDLE_HIT_PX / 2 + 2,
      y: layout.resize.y,
    }
    expect(findAreaObjectHandleAt(justOutside, 'structuralColumn', object, 1)).toBeUndefined()

    // Zoom 0.5'te aynı piksel yarıçapı iki kat dünya birimi eder → artık yakalar.
    const layoutFar = getAreaObjectHandleLayout('structuralColumn', object, 0.5)
    expect(findAreaObjectHandleAt(layoutFar.resize, 'structuralColumn', object, 0.5)).toBe('resize')
  })
})

describe('getAreaObjectAngleFromPointer', () => {
  const center = { x: 0, y: 0 }

  it('imleç yukarıdayken açı 0 (ikon nesnenin +y ucunda)', () => {
    expect(getAreaObjectAngleFromPointer({ x: 0, y: 100 }, center)).toBeCloseTo(0, 5)
  })

  it('imleç sola gidince 90 dereceye döner', () => {
    expect(getAreaObjectAngleFromPointer({ x: -100, y: 0 }, center)).toBeCloseTo(90, 5)
  })

  it('sonuç her zaman 0-359 aralığında', () => {
    const angle = getAreaObjectAngleFromPointer({ x: 100, y: 0 }, center)

    expect(angle).toBeGreaterThanOrEqual(0)
    expect(angle).toBeLessThan(360)
  })
})

describe('resizeAreaObjectFromCorner', () => {
  it('karşı köşe SABİT kalır, nesne oradan büyür', () => {
    const object = makeAreaObject()
    const fixedBefore = getAreaObjectHandleLayout('structuralColumn', object, ZOOM).fixedCorner

    const next = resizeAreaObjectFromCorner(
      'structuralColumn',
      object,
      { x: 150, y: -150 },
      MIN_AREA_OBJECT_SIZE_CM,
      ZOOM,
    )
    const fixedAfter = getAreaObjectHandleLayout(
      'structuralColumn',
      { ...object, ...next },
      ZOOM,
    ).fixedCorner

    expect(fixedAfter.x).toBeCloseTo(fixedBefore.x, 5)
    expect(fixedAfter.y).toBeCloseTo(fixedBefore.y, 5)
    expect(next.widthCm).toBeCloseTo(200, 5)
    expect(next.lengthCm).toBeCloseTo(200, 5)
  })

  it('döndürülmüş nesnede de karşı köşe sabit kalır', () => {
    const object = makeAreaObject({ x: 40, y: 25, angleDeg: 37 })
    const fixedBefore = getAreaObjectHandleLayout('structuralColumn', object, ZOOM).fixedCorner

    const next = resizeAreaObjectFromCorner(
      'structuralColumn',
      object,
      { x: 200, y: -120 },
      MIN_AREA_OBJECT_SIZE_CM,
      ZOOM,
    )
    const fixedAfter = getAreaObjectHandleLayout(
      'structuralColumn',
      { ...object, ...next },
      ZOOM,
    ).fixedCorner

    expect(fixedAfter.x).toBeCloseTo(fixedBefore.x, 5)
    expect(fixedAfter.y).toBeCloseTo(fixedBefore.y, 5)
  })

  it('imleç sabit köşenin ötesine geçse bile boyut en az sınırın altına düşmez', () => {
    const object = makeAreaObject()

    const next = resizeAreaObjectFromCorner(
      'structuralColumn',
      object,
      { x: -200, y: 200 },
      MIN_AREA_OBJECT_SIZE_CM,
      ZOOM,
    )

    expect(next.widthCm).toBe(MIN_AREA_OBJECT_SIZE_CM)
    expect(next.lengthCm).toBe(MIN_AREA_OBJECT_SIZE_CM)
  })
})
