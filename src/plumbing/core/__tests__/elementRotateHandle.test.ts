import { describe, expect, it } from 'vitest'

import {
  getElementAngleFromPointer,
  getElementRotateHandlePosition,
  hasAnyPortConnection,
  isPointerOnElementRotateHandle,
} from '../elementRotateHandle'
import type { InstallationElement } from '../installationModel'
import type { SymbolMetadata } from '../symbolMetadata'

// Gerçek service-box.meta.json ile aynı ölçüler: 60×60, origin tam ortada.
const metadata: SymbolMetadata = {
  id: 'serviceBox',
  label: 'Servis Kutusu',
  asset: 'service-box.svg',
  viewBox: [0, 0, 60, 60],
  origin: [30, 30],
  ports: [{ id: 'out', type: 'output', position: [60, 30], direction: [1, 0] }],
  bounds: { min: [0, 0], max: [60, 60] },
}

function makeElement(overrides: Partial<InstallationElement> = {}): InstallationElement {
  return {
    id: 1,
    floorId: 1,
    type: 'serviceBox',
    position: { x: 100, y: 100 },
    angleDeg: 0,
    scale: 1,
    ...overrides,
  }
}

describe('getElementRotateHandlePosition', () => {
  it('açı 0 iken elemanın yerel +y ucunun biraz DIŞINDA durur', () => {
    const element = makeElement()
    const position = getElementRotateHandlePosition(element, metadata, 1)

    expect(position.x).toBeCloseTo(100)
    expect(position.y).toBeGreaterThan(130) // bounds.max.y (30) + ofset
  })

  it('zoom büyüdükçe EKRAN ofseti sabit kalır, dünya ofseti küçülür', () => {
    const element = makeElement()
    const near = getElementRotateHandlePosition(element, metadata, 1)
    const far = getElementRotateHandlePosition(element, metadata, 2)

    expect(far.y - element.position.y).toBeLessThan(near.y - element.position.y)
  })

  it('90° döndürülmüş elemanda tutamaç yerel +y yerine dünya −x ekseninde durur', () => {
    const element = makeElement({ angleDeg: 90 })
    const position = getElementRotateHandlePosition(element, metadata, 1)

    expect(position.x).toBeLessThan(70)
    expect(position.y).toBeCloseTo(100)
  })
})

describe('isPointerOnElementRotateHandle', () => {
  it('tutamacın tam üstündeki imleç TRUE döner', () => {
    const element = makeElement()
    const handlePosition = getElementRotateHandlePosition(element, metadata, 1)

    expect(isPointerOnElementRotateHandle(handlePosition, element, metadata, 1)).toBe(true)
  })

  it('elemanın merkezindeki imleç FALSE döner (tutamaç orada değil)', () => {
    const element = makeElement()

    expect(isPointerOnElementRotateHandle(element.position, element, metadata, 1)).toBe(false)
  })
})

describe('getElementAngleFromPointer', () => {
  const center = { x: 0, y: 0 }

  it('imleç merkezin TAM ÜSTÜNDEYSE (+y) açı 0 döner — tutamacın dinlenme konumu', () => {
    expect(getElementAngleFromPointer({ x: 0, y: 10 }, center)).toBeCloseTo(0)
  })

  it('imleç merkezin SOLUNDAYSA (−x) açı 90 döner', () => {
    expect(getElementAngleFromPointer({ x: -10, y: 0 }, center)).toBeCloseTo(90)
  })

  it('imleç merkezin ALTINDAYSA (−y) açı 180 döner', () => {
    expect(getElementAngleFromPointer({ x: 0, y: -10 }, center)).toBeCloseTo(180)
  })

  it('imleç merkezin SAĞINDAYSA (+x) açı 270 döner', () => {
    expect(getElementAngleFromPointer({ x: 10, y: 0 }, center)).toBeCloseTo(270)
  })
})

describe('hasAnyPortConnection', () => {
  it('elemanın portuna bağlı bir kayıt varsa true döner', () => {
    const connections = [
      {
        lineId: 1,
        end: 'start' as const,
        target: { kind: 'port' as const, elementId: 1, portId: 'out' },
      },
    ]

    expect(hasAnyPortConnection(connections, 1)).toBe(true)
  })

  it('bağlantı yoksa ya da başka bir elemana aitse false döner', () => {
    const connections = [
      {
        lineId: 1,
        end: 'start' as const,
        target: { kind: 'port' as const, elementId: 2, portId: 'out' },
      },
    ]

    expect(hasAnyPortConnection(connections, 1)).toBe(false)
    expect(hasAnyPortConnection([], 1)).toBe(false)
  })
})
