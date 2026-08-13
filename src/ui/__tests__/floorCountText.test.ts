import { describe, expect, it } from 'vitest'

import { EMPTY_FLOOR_CONTENT_COUNTS, type FloorContentCounts } from '../../core/floorContent'
import { describeVerticalAxis, formatVerticalAxisCounts } from '../floors/floorCountText'

function countsWith(overrides: Partial<FloorContentCounts>): FloorContentCounts {
  return { ...EMPTY_FLOOR_CONTENT_COUNTS, ...overrides }
}

describe('formatVerticalAxisCounts — kopyalama özetindeki "Düşey" satırı', () => {
  it('düşey eksen yoksa "yok" der', () => {
    expect(formatVerticalAxisCounts(EMPTY_FLOOR_CONTENT_COUNTS)).toBe('yok')
  })

  it('iki türü de kardeş satırlarla aynı ayraçla yazar', () => {
    expect(
      formatVerticalAxisCounts(countsWith({ flueShaftCount: 2, columnVentilationCount: 1 })),
    ).toBe('2 baca şaftı · 1 kolon havalandırması')
  })

  it('sıfır olan türü hiç yazmaz', () => {
    expect(formatVerticalAxisCounts(countsWith({ flueShaftCount: 3 }))).toBe('3 baca şaftı')
  })

  it('mimarinin geri kalanını KARIŞTIRMAZ: yalnız düşey eksen sayılır', () => {
    // Alan nesnesi sayısı mimari satırında ayrıca geçiyor; bu satır merdiven ya
    // da yapısal kolonu göstermemeli, yoksa "düşey" vurgusu anlamını yitirir.
    expect(formatVerticalAxisCounts(countsWith({ areaObjectCount: 5, wallCount: 9 }))).toBe('yok')
  })
})

describe('describeVerticalAxis — silme uyarısının cümlesi', () => {
  it('cümle içinde "ve" ile bağlar', () => {
    expect(describeVerticalAxis(countsWith({ flueShaftCount: 1, columnVentilationCount: 1 }))).toBe(
      '1 baca şaftı ve 1 kolon havalandırması',
    )
  })

  it('tek tür varsa bağlaç yazmaz', () => {
    expect(describeVerticalAxis(countsWith({ columnVentilationCount: 2 }))).toBe(
      '2 kolon havalandırması',
    )
  })
})
