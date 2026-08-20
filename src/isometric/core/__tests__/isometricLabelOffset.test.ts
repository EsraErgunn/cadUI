import { describe, expect, it } from 'vitest'

import {
  ELEMENT_LABEL_DISTANCE_FACTOR,
  LINE_LABEL_DISTANCE_FACTOR,
  getIsometricLabelOffsetCm,
} from '../isometricLabels'
import { ISOMETRIC_ANGLES_DEFAULT, projectIsometric } from '../isometricProjection'

const CENTER: readonly [number, number, number] = [0, 0, 0]
const SCENE_SIZE_CM = 1000

function offsetFor(
  anchor: readonly [number, number, number],
  factor = LINE_LABEL_DISTANCE_FACTOR,
) {
  return getIsometricLabelOffsetCm(anchor, CENTER, ISOMETRIC_ANGLES_DEFAULT, SCENE_SIZE_CM, factor)
}

describe('getIsometricLabelOffsetCm', () => {
  it('etiketi çizimin merkezinden DIŞARI iter', () => {
    // Kayma, çapanın ekrandaki yönüyle aynı yönde olmalı; ters olsaydı etiket
    // çizimin ortasına, gövdenin üstüne düşerdi.
    const anchor: [number, number, number] = [400, 200, -300]
    const anchorScreen = projectIsometric(anchor, ISOMETRIC_ANGLES_DEFAULT)
    const offset = offsetFor(anchor)

    const anchorAngle = Math.atan2(anchorScreen.y, anchorScreen.x)
    const offsetAngle = Math.atan2(offset.y, offset.x)
    expect(offsetAngle).toBeCloseTo(anchorAngle, 6)
  })

  it('uzaklık çizim boyutuyla ÖLÇEKLENİR (sabit cm değil)', () => {
    const anchor: [number, number, number] = [400, 200, -300]
    const small = getIsometricLabelOffsetCm(
      anchor,
      CENTER,
      ISOMETRIC_ANGLES_DEFAULT,
      2000,
      LINE_LABEL_DISTANCE_FACTOR,
    )
    const large = getIsometricLabelOffsetCm(
      anchor,
      CENTER,
      ISOMETRIC_ANGLES_DEFAULT,
      8000,
      LINE_LABEL_DISTANCE_FACTOR,
    )

    expect(Math.hypot(large.x, large.y)).toBeCloseTo(Math.hypot(small.x, small.y) * 4, 6)
  })

  it('çok küçük çizimde alt sınır devreye girer', () => {
    const anchor: [number, number, number] = [10, 5, -5]
    const tiny = getIsometricLabelOffsetCm(
      anchor,
      CENTER,
      ISOMETRIC_ANGLES_DEFAULT,
      1,
      LINE_LABEL_DISTANCE_FACTOR,
    )

    // 1 cm'lik çizimde oran sıfıra yakın çıkar; etiket yine de gövdeden ayrılmalı.
    expect(Math.hypot(tiny.x, tiny.y)).toBeGreaterThan(50)
  })

  it('hat etiketi eleman etiketinden DAHA YAKIN durur', () => {
    const anchor: [number, number, number] = [400, 200, -300]
    const lineOffset = offsetFor(anchor, LINE_LABEL_DISTANCE_FACTOR)
    const elementOffset = offsetFor(anchor, ELEMENT_LABEL_DISTANCE_FACTOR)

    expect(Math.hypot(lineOffset.x, lineOffset.y)).toBeLessThan(
      Math.hypot(elementOffset.x, elementOffset.y),
    )
  })

  it('merkezle çakışan çapada yön tanımsız kalmaz', () => {
    const offset = offsetFor([0, 0, 0])
    expect(Number.isFinite(offset.x)).toBe(true)
    expect(Number.isFinite(offset.y)).toBe(true)
    expect(Math.hypot(offset.x, offset.y)).toBeGreaterThan(0)
  })
})
