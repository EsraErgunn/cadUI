import { describe, expect, it } from 'vitest'

import { getElementsInRect, getElementWorldCorners } from '../elementPicking'
import type { InstallationElement } from '../installationModel'
import type { SymbolMetadata } from '../symbolMetadata'

/** origin kutunun ortasında: yerel kutu 20 (x) × 10 (y) cm, merkezi (0,0). */
const metadata: SymbolMetadata = {
  id: 'valve',
  label: 'Vana',
  asset: 'valve.svg',
  viewBox: [0, 0, 20, 10],
  origin: [10, 5],
  ports: [],
  bounds: { min: [0, 0], max: [20, 10] },
}

const getMetadata = () => metadata

function makeElement(overrides: Partial<InstallationElement> = {}): InstallationElement {
  return {
    id: 1,
    floorId: 1,
    type: 'valve',
    position: { x: 0, y: 0 },
    angleDeg: 0,
    scale: 1,
    ...overrides,
  }
}

describe('getElementWorldCorners', () => {
  it('dönmemiş eleman kutusunu konumuna öteler', () => {
    const corners = getElementWorldCorners(makeElement({ position: { x: 100, y: 200 } }), metadata)
    expect(corners).toEqual([
      { x: 90, y: 195 },
      { x: 110, y: 195 },
      { x: 110, y: 205 },
      { x: 90, y: 205 },
    ])
  })

  it('açıyı getPortWorldPosition ile aynı yönde uygular (R2)', () => {
    const [firstCorner] = getElementWorldCorners(makeElement({ angleDeg: 90 }), metadata)
    // (-10,-5) 90° CCW döndürülünce (5,-10) olur.
    expect(firstCorner.x).toBeCloseTo(5)
    expect(firstCorner.y).toBeCloseTo(-10)
  })

  it('ölçeği kutuya uygular', () => {
    const corners = getElementWorldCorners(makeElement({ scale: 2 }), metadata)
    expect(corners[0]).toEqual({ x: -20, y: -10 })
  })
})

describe('getElementsInRect', () => {
  const element = makeElement({ position: { x: 100, y: 100 } })

  it('tamamen içeride kalanı seçer', () => {
    const rect = { minX: 0, minY: 0, maxX: 200, maxY: 200 }
    expect(getElementsInRect(rect, [element], getMetadata)).toEqual([1])
  })

  it('yalnız KESİŞENİ seçmez', () => {
    // Çerçeve elemanın sol yarısını kesiyor: sağ köşeler dışarıda.
    const rect = { minX: 0, minY: 0, maxX: 105, maxY: 200 }
    expect(getElementsInRect(rect, [element], getMetadata)).toEqual([])
  })

  it('dönmüş eleman büyüyen kutusuyla sınanır', () => {
    // Dönmemişken sığan çerçeve, 90° dönünce sığmaz: kutu 20×10 iken 10×20 olur.
    const rect = { minX: 89, minY: 94, maxX: 111, maxY: 106 }
    expect(getElementsInRect(rect, [element], getMetadata)).toEqual([1])
    expect(
      getElementsInRect(rect, [makeElement({ ...element, angleDeg: 90 })], getMetadata),
    ).toEqual([])
  })

  it('çerçeve dışındaki elemanı seçmez', () => {
    const rect = { minX: 500, minY: 500, maxX: 600, maxY: 600 }
    expect(getElementsInRect(rect, [element], getMetadata)).toEqual([])
  })
})
