import { describe, expect, it } from 'vitest'

import type { ThreePosition } from '../../../core/coords'
import { layoutIsometricLabels } from '../isometricLabelLayout'
import type { IsometricLabelRequest } from '../isometricLabelLayout'
import { ISOMETRIC_ANGLES_DEFAULT, projectIsometric } from '../isometricProjection'

const CENTER: ThreePosition = [0, 0, 0]
const SCENE_SIZE_CM = 1000
const MIN_SEPARATION_CM = 60

function layout(requests: IsometricLabelRequest[], minSeparationCm = MIN_SEPARATION_CM) {
  return layoutIsometricLabels(
    requests,
    CENTER,
    ISOMETRIC_ANGLES_DEFAULT,
    SCENE_SIZE_CM,
    minSeparationCm,
  )
}

/** Etiketin merkeze göre EKRAN konumu = çapanın izdüşümü + kayma. */
function screenPositionOf(
  placements: Map<string, { x: number; y: number }>,
  request: IsometricLabelRequest,
) {
  const offset = placements.get(request.key)
  if (!offset) throw new Error(`${request.key} yerleştirilmedi`)

  const anchorScreen = projectIsometric(request.anchor, ISOMETRIC_ANGLES_DEFAULT)
  const centerScreen = projectIsometric(CENTER, ISOMETRIC_ANGLES_DEFAULT)
  return {
    x: anchorScreen.x - centerScreen.x + offset.x,
    y: anchorScreen.y - centerScreen.y + offset.y,
  }
}

function makeRequest(key: string, anchor: ThreePosition, distanceFactor = 1): IsometricLabelRequest {
  return { key, anchor, distanceFactor }
}

describe('layoutIsometricLabels', () => {
  it('boş listede boş sonuç', () => {
    expect(layout([]).size).toBe(0)
  })

  it('aynı gruptaki etiketlerin hepsi AYNI yarıçapta durur (halka)', () => {
    const requests = [
      makeRequest('a', [400, 0, 0]),
      makeRequest('b', [0, 300, -200]),
      makeRequest('c', [-500, 100, 400]),
    ]
    const placements = layout(requests)

    const radii = requests.map((request) => {
      const position = screenPositionOf(placements, request)
      return Math.hypot(position.x, position.y)
    })

    expect(radii[1]).toBeCloseTo(radii[0], 6)
    expect(radii[2]).toBeCloseTo(radii[0], 6)
  })

  it('halka en uzak çapanın DIŞINDA kalır — etiket gövdeye binmez', () => {
    const requests = [makeRequest('a', [400, 0, 0]), makeRequest('b', [-400, 0, 0])]
    const placements = layout(requests)

    const centerScreen = projectIsometric(CENTER, ISOMETRIC_ANGLES_DEFAULT)
    for (const request of requests) {
      const anchorScreen = projectIsometric(request.anchor, ISOMETRIC_ANGLES_DEFAULT)
      const anchorRadius = Math.hypot(
        anchorScreen.x - centerScreen.x,
        anchorScreen.y - centerScreen.y,
      )
      const position = screenPositionOf(placements, request)
      expect(Math.hypot(position.x, position.y)).toBeGreaterThan(anchorRadius)
    }
  })

  it('açıca ÇAKIŞAN etiketler birbirinden ayrılır', () => {
    // Üç çapa neredeyse aynı yönde: ışınsal kaydırmada üçü de üst üste binerdi.
    const requests = [
      makeRequest('a', [400, 0, 0]),
      makeRequest('b', [402, 0, 0]),
      makeRequest('c', [404, 0, 0]),
    ]
    const placements = layout(requests)

    const positions = requests.map((request) => screenPositionOf(placements, request))
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const gap = Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y)
        expect(gap).toBeGreaterThan(MIN_SEPARATION_CM * 0.9)
      }
    }
  })

  it('halkaya sığmayacak kadar çok etiket EŞİT dağıtılır', () => {
    const requests = Array.from({ length: 40 }, (_unused, index) =>
      makeRequest(`k${index}`, [400 + index, 0, 0]),
    )
    const placements = layout(requests, 400)

    expect(placements.size).toBe(requests.length)
    const angles = requests
      .map((request) => {
        const position = screenPositionOf(placements, request)
        return Math.atan2(position.y, position.x)
      })
      .sort((a, b) => a - b)

    // Eşit dağıtımda ardışık açı farkları birbirine eşit olmalı.
    const firstGap = angles[1] - angles[0]
    for (let index = 2; index < angles.length; index += 1) {
      expect(angles[index] - angles[index - 1]).toBeCloseTo(firstGap, 6)
    }
  })

  it('farklı uzaklık çarpanları AYRI halkalara oturur', () => {
    const inner = makeRequest('line', [400, 0, 0], 0.72)
    const outer = makeRequest('element', [400, 0, 0], 1)
    const placements = layout([inner, outer])

    const innerRadius = Math.hypot(
      screenPositionOf(placements, inner).x,
      screenPositionOf(placements, inner).y,
    )
    const outerRadius = Math.hypot(
      screenPositionOf(placements, outer).x,
      screenPositionOf(placements, outer).y,
    )

    expect(innerRadius).toBeLessThan(outerRadius)
  })

  it('merkezle çakışan çapa sonsuz/NaN üretmez', () => {
    const placements = layout([makeRequest('a', [0, 0, 0])])
    const offset = placements.get('a')

    expect(offset).toBeDefined()
    expect(Number.isFinite(offset?.x)).toBe(true)
    expect(Number.isFinite(offset?.y)).toBe(true)
  })
})
