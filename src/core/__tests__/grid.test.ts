import { describe, expect, it } from 'vitest'

import { GRID_LEVELS, pickGridLevel, snapPointToGrid, snapToGrid } from '../grid'

describe('pickGridLevel', () => {
  it('varsayılan zoomda 50 cm ince / 1 m kalın kademeyi seçer (KK-2)', () => {
    expect(pickGridLevel(1)).toEqual({ minorCm: 50, majorCm: 100 })
  })

  it('uzaklaştıkça bir üst kademeye çıkar', () => {
    // 50 * 0.2 = 10 px < 12 px eşiği → 100 cm kademesi (100 * 0.2 = 20 px).
    expect(pickGridLevel(0.2).minorCm).toBe(100)
    // 100 * 0.1 = 10 px < 12 px → 500 cm kademesi.
    expect(pickGridLevel(0.1).minorCm).toBe(500)
  })

  it('en uzak zoomda bile bir kademe döndürür', () => {
    expect(pickGridLevel(0.001)).toBe(GRID_LEVELS[GRID_LEVELS.length - 1])
  })

  it('kalın çizgi aralığı her zaman ince aralığın tam katıdır', () => {
    for (const level of GRID_LEVELS) {
      expect(level.majorCm % level.minorCm).toBe(0)
    }
  })
})

describe('snapToGrid', () => {
  it('en yakın ızgara kesişimine yuvarlar', () => {
    expect(snapToGrid(124, 50)).toBe(100)
    expect(snapToGrid(126, 50)).toBe(150)
  })

  it('negatif değerlerde de en yakına gider', () => {
    expect(snapToGrid(-124, 50)).toBe(-100)
    expect(snapToGrid(-126, 50)).toBe(-150)
  })

  it('tam yarım adımda -0 üretmez', () => {
    // Math.round(-0.5) === -0; sonuç 0 olmalı, -0 değil.
    expect(Object.is(snapToGrid(-25, 50), 0)).toBe(true)
  })

  it('geçersiz adımda değeri olduğu gibi bırakır', () => {
    expect(snapToGrid(123, 0)).toBe(123)
  })
})

describe('snapPointToGrid', () => {
  it('iki ekseni de yakalar', () => {
    expect(snapPointToGrid({ x: 124, y: -126 }, 50)).toEqual({ x: 100, y: -150 })
  })
})
