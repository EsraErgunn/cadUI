import { describe, expect, it } from 'vitest'

import { formatElevationMeters, formatLengthMeters, formatSignedMeters } from '../lengthFormat'

describe('formatLengthMeters', () => {
  it('cm veriyi metre + Türkçe ayırıcıyla yazar', () => {
    expect(formatLengthMeters(350)).toBe('3,50 m')
  })
})

describe('formatSignedMeters', () => {
  it('pozitif kotu artı işaretiyle yazar', () => {
    expect(formatSignedMeters(200)).toBe('+2,00')
  })

  it('negatif kotu eksi işaretiyle yazar', () => {
    expect(formatSignedMeters(-50)).toBe('-0,50')
  })

  it('sıfır kotu işaretsiz bırakır', () => {
    expect(formatSignedMeters(0)).toBe('0,00')
  })

  it('yuvarlandığında sıfıra düşen negatif değeri "-0,00" yazmaz', () => {
    expect(formatSignedMeters(-0.4)).toBe('0,00')
  })
})

describe('formatElevationMeters', () => {
  it('tek başına duran kota birim ekler', () => {
    expect(formatElevationMeters(15)).toBe('+0,15 m')
  })
})
