import { describe, expect, it } from 'vitest'

import type { InstallationLine } from '../installationModel'
import {
  getLineDescriptionLabel,
  getLineIdentityLabel,
  getLineLabelAnchorCm,
  getLineMeasurementLabel,
} from '../lineLabel'

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
    ...overrides,
  }
}

describe('getLineIdentityLabel', () => {
  it('gaz taşıyan hatta anma çapını verir', () => {
    expect(getLineIdentityLabel(makeLine())).toBe('DN25')
    expect(getLineIdentityLabel(makeLine({ kind: 'applianceStub' }))).toBe('DN25')
  })

  it('deşarj hattında TÜRÜN adını verir — çapları yok', () => {
    expect(getLineIdentityLabel(makeLine({ kind: 'chimney' }))).toBe('Baca')
    expect(getLineIdentityLabel(makeLine({ kind: 'ventilationDuct' }))).toBe(
      'Havalandırma Kanalı',
    )
  })
})

describe('getLineMeasurementLabel', () => {
  it('boyun yanına hangi boru olduğunu yazar', () => {
    expect(getLineMeasurementLabel(makeLine(), 120)).toBe('1,20 m · DN25')
  })

  it('deşarj hattında boy türün adıyla gelir', () => {
    expect(getLineMeasurementLabel(makeLine({ kind: 'chimney' }), 300)).toBe('3,00 m · Baca')
  })
})

describe('getLineDescriptionLabel', () => {
  it('yalnız açıklamayı yazar — tür adı ("Boru") etikete GİRMEZ', () => {
    const line = makeLine({ pipe: { startHeightCm: 0, endHeightCm: 0, description: 'Kolon hattı' } })
    expect(getLineDescriptionLabel(line)).toBe('Kolon hattı')
  })

  it('açıklaması olmayan hat etiket ÜRETMEZ', () => {
    expect(getLineDescriptionLabel(makeLine())).toBeNull()
    expect(
      getLineDescriptionLabel(makeLine({ pipe: { startHeightCm: 0, endHeightCm: 0, description: '' } })),
    ).toBeNull()
  })

  it('yalnız boşluktan oluşan açıklama etiket ÜRETMEZ', () => {
    const line = makeLine({ pipe: { startHeightCm: 0, endHeightCm: 0, description: '   ' } })
    expect(getLineDescriptionLabel(line)).toBeNull()
  })

  it('açıklama alanı olmayan türde etiket yok', () => {
    expect(getLineDescriptionLabel(makeLine({ kind: 'chimney' }))).toBeNull()
  })
})

describe('getLineLabelAnchorCm', () => {
  it('ORTA bölümün ortasına, dikinde kaydırarak oturur', () => {
    const anchor = getLineLabelAnchorCm(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 200 },
      ],
      10,
    )
    // Orta bölüm (100,0)→(100,200); ortası (100,100), dik BİRİM vektörü (-1,0).
    expect(anchor).toEqual({ x: 90, y: 100 })
  })

  it('tek noktalı hatta çapa YOK', () => {
    expect(getLineLabelAnchorCm([{ x: 0, y: 0 }], 10)).toBeNull()
  })

  it('ters işaretli kaydırma karşı tarafa düşer — ölçü etiketiyle çakışmasın', () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    expect(getLineLabelAnchorCm(positions, 10)).toEqual({ x: 50, y: 10 })
    expect(getLineLabelAnchorCm(positions, -10)).toEqual({ x: 50, y: -10 })
  })
})
