import { describe, expect, it } from 'vitest'

import type { InstallationLine } from '../../../plumbing/core/installationModel'
import type { IsometricElevationContext } from '../isometricElevation'
import { getIsometricRiseLabel } from '../isometricLabels'
import type { IsometricLineGeometry } from '../isometricModel'

function makeLine(overrides: Partial<InstallationLine> = {}): InstallationLine {
  return {
    id: 1,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: 11, position: { x: 0, y: 0 } },
      { id: 12, position: { x: 400, y: 0 } },
    ],
    segments: [{ id: 13, fromPointId: 11, toPointId: 12 }],
    pipe: { startHeightCm: 0, endHeightCm: 0, description: '' },
    ...overrides,
  }
}

/** Tek hatlı testler: bağlam boş, kot hattın kendisinden gelir. */
const EMPTY_CONTEXT: IsometricElevationContext = { lines: [], connections: [] }

function makeGeometry(
  positions: IsometricLineGeometry['positions'],
  lineId = 1,
): IsometricLineGeometry {
  return {
    lineId,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    outerWidthCm: 3.37,
    pointIds: positions.map((_, index) => 11 + index),
    positions,
  }
}

describe('getIsometricRiseLabel', () => {
  it('kot değişmeyen hat etiket ÜRETMEZ', () => {
    const geometry = makeGeometry([
      [0, 0, 0],
      [400, 0, 0],
    ])
    expect(getIsometricRiseLabel(makeLine(), geometry, EMPTY_CONTEXT)).toBeNull()
  })

  it('yükselen düşey hatta h yazar, çapası çubuğun ORTASI', () => {
    // Plan boyu sıfır, kot 0 → 275 (klavyeden `+` ile yazılan tipik kolon).
    const line = makeLine({
      points: [
        { id: 11, position: { x: 0, y: 0 } },
        { id: 12, position: { x: 0, y: 0 } },
      ],
      pipe: { startHeightCm: 0, endHeightCm: 275, description: '' },
    })
    const geometry = makeGeometry([
      [0, 0, 0],
      [0, 275, 0],
    ])

    expect(getIsometricRiseLabel(line, geometry, EMPTY_CONTEXT)).toEqual({
      key: 'rise-1',
      lineId: 1,
      anchor: [0, 137.5, 0],
      text: 'h=2,75 m',
    })
  })

  it('inen hatta da İŞARETSİZ mutlak yükseklik yazar', () => {
    // h bir mesafe, kot değil: yön izometrik çizimin kendisinden okunuyor.
    const line = makeLine({
      points: [
        { id: 11, position: { x: 0, y: 0 } },
        { id: 12, position: { x: 0, y: 0 } },
      ],
      pipe: { startHeightCm: 200, endHeightCm: 50, description: '' },
    })
    const geometry = makeGeometry([
      [0, 200, 0],
      [0, 50, 0],
    ])

    expect(getIsometricRiseLabel(line, geometry, EMPTY_CONTEXT)?.text).toBe('h=1,50 m')
  })

  it('yuvarlanınca sıfıra düşen fark etiket ÜRETMEZ', () => {
    const line = makeLine({
      pipe: { startHeightCm: 0, endHeightCm: 0.3, description: '' },
    })
    const geometry = makeGeometry([
      [0, 0, 0],
      [400, 0.3, 0],
    ])
    expect(getIsometricRiseLabel(line, geometry, EMPTY_CONTEXT)).toBeNull()
  })

  it('eğimli çok köşeli hatta TEK etiket: toplam kot farkı', () => {
    // Kot plan uzunluğuna göre dağıtılıyor; parça parça yazılsaydı tek bir
    // yükseliş üç ayrı kesre bölünürdü.
    const line = makeLine({
      points: [
        { id: 11, position: { x: 0, y: 0 } },
        { id: 12, position: { x: 200, y: 0 } },
        { id: 13, position: { x: 400, y: 0 } },
      ],
      segments: [
        { id: 14, fromPointId: 11, toPointId: 12 },
        { id: 15, fromPointId: 12, toPointId: 13 },
      ],
      pipe: { startHeightCm: 0, endHeightCm: 100, description: '' },
    })
    const geometry = makeGeometry([
      [0, 0, 0],
      [200, 50, 0],
      [400, 100, 0],
    ])

    expect(getIsometricRiseLabel(line, geometry, EMPTY_CONTEXT)?.text).toBe('h=1,00 m')
  })
})
