import { describe, expect, it } from 'vitest'

import type { Opening } from '../model'
import {
  DEFAULT_OPENING_WIDTH_CM,
  getOccupiedRanges,
  getOpeningSpan,
  getOpeningTypeForTool,
  getOpeningsOnWall,
  isSpanOverlapping,
  isSpanWithinRange,
} from '../opening'
import { RANGE_OF_WALL_8, window12 } from './openingFixture'

const openings = [window12]

describe('getOpeningSpan', () => {
  it('offsetCm ORTAYI ölçer, yarım genişlik iki yana açılır', () => {
    expect(getOpeningSpan({ offsetCm: 200, widthCm: 90 })).toEqual([155, 245])
  })

  it('duvarın ortasına yerleştirme genişlikten bağımsızdır', () => {
    // 500 cm duvarın ortası her genişlikte offsetCm 250'dir — kenar ölçülseydi kayardı.
    const narrow = getOpeningSpan({ offsetCm: 250, widthCm: 90 })
    const wide = getOpeningSpan({ offsetCm: 250, widthCm: 200 })

    expect(narrow).toEqual([205, 295])
    expect(wide).toEqual([150, 350])
    expect((narrow[0] + narrow[1]) / 2).toBe(250)
    expect((wide[0] + wide[1]) / 2).toBe(250)
  })
})

describe('getOpeningsOnWall', () => {
  it('yalnız o duvarın açıklıklarını verir', () => {
    expect(getOpeningsOnWall(8, openings)).toEqual([window12])
    expect(getOpeningsOnWall(9, openings)).toEqual([])
  })
})

describe('getOccupiedRanges', () => {
  it('açıklığın kapladığı aralığı verir', () => {
    expect(getOccupiedRanges(8, openings)).toEqual([[190, 310]])
  })

  it('sırasız eklenen açıklıkları başlangıcına göre artan döndürür', () => {
    const unordered: Opening[] = [
      { id: 13, wallId: 8, offsetCm: 400, widthCm: 90, type: 'door' },
      window12,
      { id: 14, wallId: 8, offsetCm: 80, widthCm: 90, type: 'door' },
    ]

    expect(getOccupiedRanges(8, unordered)).toEqual([
      [35, 125],
      [190, 310],
      [355, 445],
    ])
  })

  it('açıklığı olmayan duvarda boş döner', () => {
    expect(getOccupiedRanges(9, openings)).toEqual([])
  })
})

describe('isSpanWithinRange', () => {
  it('sınıra tam oturan aralığı kabul eder', () => {
    expect(isSpanWithinRange([25, 470], RANGE_OF_WALL_8)).toBe(true)
  })

  it('alt sınırın altına taşanı reddeder', () => {
    expect(isSpanWithinRange([24.99, 115], RANGE_OF_WALL_8)).toBe(false)
  })

  it('üst sınırın üstüne taşanı reddeder', () => {
    expect(isSpanWithinRange([380, 471], RANGE_OF_WALL_8)).toBe(false)
  })
})

describe('isSpanOverlapping', () => {
  it('uç uca değen aralıkları çakışma saymaz', () => {
    expect(isSpanOverlapping([310, 400], [[190, 310]])).toBe(false)
  })

  it('1 cm binen aralığı çakışma sayar', () => {
    expect(isSpanOverlapping([309, 399], [[190, 310]])).toBe(true)
  })

  it('tümüyle içine düşen aralığı çakışma sayar', () => {
    expect(isSpanOverlapping([240, 260], [[190, 310]])).toBe(true)
  })

  it('başka aralık yoksa çakışma yoktur', () => {
    expect(isSpanOverlapping([190, 310], [])).toBe(false)
  })
})

describe('DEFAULT_OPENING_WIDTH_CM', () => {
  it('kapı ve pencere varsayılanları sabittir', () => {
    expect(DEFAULT_OPENING_WIDTH_CM).toEqual({ door: 90, window: 120 })
  })
})

describe('getOpeningTypeForTool', () => {
  it('kapı ve pencere araçlarını eşler', () => {
    expect(getOpeningTypeForTool('door')).toBe('door')
    expect(getOpeningTypeForTool('window')).toBe('window')
  })

  it('açıklık üretmeyen araçta undefined döner', () => {
    expect(getOpeningTypeForTool('selection')).toBeUndefined()
    expect(getOpeningTypeForTool('drawWall')).toBeUndefined()
  })
})
