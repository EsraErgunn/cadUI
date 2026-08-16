import { describe, expect, it } from 'vitest'

import { formatAngleDegrees } from '../angleFormat'

describe('formatAngleDegrees', () => {
  it('dik açıyı ondalıksız yazar', () => {
    expect(formatAngleDegrees(90)).toBe('90°')
  })

  it('kayan nokta artığını tam sayı sayar', () => {
    // 90° hesabı trigonometriden 89.99999999 çıkabiliyor; "90,0°" bile fazla.
    expect(formatAngleDegrees(89.9999999)).toBe('90°')
  })

  it('eğik duvarda ondalık gösterir', () => {
    expect(formatAngleDegrees(45.5)).toBe('45,5°')
  })

  it('ondalık ayırıcı Türkçe (virgül)', () => {
    expect(formatAngleDegrees(123.4)).toContain(',')
  })
})
