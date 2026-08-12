import { describe, expect, it } from 'vitest'

import {
  findBeamUnderPoint,
  getBeamCorners,
  getBeamLengthCm,
  getNextBeamLabel,
  isBeamLabelTaken,
  isPointInBeam,
} from '../beam'
import type { Beam } from '../model'

const FLOOR_ID = 1

function makeBeam(overrides: Partial<Beam> = {}): Beam {
  return {
    id: 1,
    floorId: FLOOR_ID,
    x1: 0,
    y1: 0,
    x2: 200,
    y2: 0,
    thicknessCm: 20,
    label: 'KR-01',
    ...overrides,
  }
}

describe('getBeamCorners', () => {
  it('yatay kirişte dikdörtgen yarım kalınlık kadar iki yana açılır', () => {
    const corners = getBeamCorners(makeBeam())!

    expect(corners).toHaveLength(4)
    expect(corners).toEqual([
      { x: 0, y: 10 },
      { x: 200, y: 10 },
      { x: 200, y: -10 },
      { x: 0, y: -10 },
    ])
  })

  it('eğik kirişte kenarlar eksene PARALEL kalır ve genişlik korunur', () => {
    const corners = getBeamCorners(makeBeam({ x2: 100, y2: 100 }))!

    // Karşılıklı iki köşe arası mesafe = kalınlık (kenarlar eksene dik açılıyor).
    expect(Math.hypot(corners[0].x - corners[3].x, corners[0].y - corners[3].y)).toBeCloseTo(20, 6)
    expect(Math.hypot(corners[1].x - corners[2].x, corners[1].y - corners[2].y)).toBeCloseTo(20, 6)
  })

  it('sıfır boy kirişte yön belirsiz — undefined döner', () => {
    expect(getBeamCorners(makeBeam({ x2: 0, y2: 0 }))).toBeUndefined()
  })
})

describe('isPointInBeam', () => {
  it('gövdenin içi TUTAR, kalınlığın dışı tutmaz', () => {
    const beam = makeBeam()

    expect(isPointInBeam({ x: 100, y: 0 }, beam)).toBe(true)
    expect(isPointInBeam({ x: 100, y: 9 }, beam)).toBe(true)
    expect(isPointInBeam({ x: 100, y: 11 }, beam)).toBe(false)
  })

  it('uçların ÖTESİ tutmaz — duvardaki gibi yuvarlak uç payı yok', () => {
    const beam = makeBeam()

    expect(isPointInBeam({ x: 0, y: 0 }, beam)).toBe(true)
    expect(isPointInBeam({ x: -1, y: 0 }, beam)).toBe(false)
    expect(isPointInBeam({ x: 201, y: 0 }, beam)).toBe(false)
  })

  it('eğik kirişte de gövdeyi doğru ölçer', () => {
    const beam = makeBeam({ x2: 100, y2: 100 })

    expect(isPointInBeam({ x: 50, y: 50 }, beam)).toBe(true)
    // Eksene dik yönde 15cm uzak: yarım kalınlığı (10) aşıyor.
    expect(isPointInBeam({ x: 50 + 10.6, y: 50 - 10.6 }, beam)).toBe(false)
  })
})

describe('findBeamUnderPoint', () => {
  it('üst üste binen kirişlerde SON ekleneni döndürür', () => {
    const older = makeBeam({ id: 1 })
    const newer = makeBeam({ id: 2 })

    expect(findBeamUnderPoint({ x: 100, y: 0 }, [older, newer], FLOOR_ID)?.id).toBe(2)
  })

  it('başka kattaki kirişi görmez', () => {
    const beam = makeBeam({ floorId: 2 })

    expect(findBeamUnderPoint({ x: 100, y: 0 }, [beam], FLOOR_ID)).toBeUndefined()
  })
})

describe('getBeamLengthCm', () => {
  it('uçlar arası mesafeyi verir', () => {
    expect(getBeamLengthCm(makeBeam({ x2: 300, y2: 400, x1: 0, y1: 0 }))).toBeCloseTo(500, 6)
  })
})

describe('etiket', () => {
  it('sıradaki etiket aynı KATTAKİ en yüksek numaranın bir fazlası', () => {
    const beams = [makeBeam({ id: 1, label: 'KR-03' }), makeBeam({ id: 2, label: 'KR-01' })]

    expect(getNextBeamLabel(beams, FLOOR_ID)).toBe('KR-04')
    // Boş katta baştan başlar.
    expect(getNextBeamLabel(beams, 2)).toBe('KR-01')
  })

  it('çakışma kat içinde tanımlı, kendisi hariç tutulur', () => {
    const beams = [makeBeam({ id: 1, label: 'KR-01' })]

    expect(isBeamLabelTaken(beams, 'KR-01', FLOOR_ID)).toBe(true)
    expect(isBeamLabelTaken(beams, 'KR-01', FLOOR_ID, 1)).toBe(false)
    expect(isBeamLabelTaken(beams, 'KR-01', 2)).toBe(false)
  })
})
