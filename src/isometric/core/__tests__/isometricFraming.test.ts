import { describe, expect, it } from 'vitest'

import type { IsometricBounds } from '../isometricModel'
import { getIsometricBoundsDiagonalCm } from '../isometricScene'

function makeBounds(
  min: [number, number, number],
  max: [number, number, number],
): IsometricBounds {
  return {
    min,
    max,
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    sizeCm: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
  }
}

describe('getIsometricBoundsDiagonalCm', () => {
  it('kutunun köşegenini verir', () => {
    // 3-4-12 → 13 (Pisagor üçlüsü), yuvarlama payı gerekmiyor.
    expect(getIsometricBoundsDiagonalCm(makeBounds([0, 0, 0], [300, 400, 1200]))).toBeCloseTo(
      1300,
      9,
    )
  })

  it('ÖTELEME çerçeveyi değiştirmez — yalnız boyut sayılır', () => {
    const atOrigin = getIsometricBoundsDiagonalCm(makeBounds([0, 0, 0], [1000, 600, 800]))
    const shifted = getIsometricBoundsDiagonalCm(
      makeBounds([5000, -300, 2000], [6000, 300, 2800]),
    )

    expect(shifted).toBeCloseTo(atOrigin, 9)
  })

  it('büyüyen çizim daha geniş çerçeve ister', () => {
    const small = getIsometricBoundsDiagonalCm(makeBounds([0, 0, 0], [500, 300, 400]))
    const large = getIsometricBoundsDiagonalCm(makeBounds([0, 0, 0], [1000, 600, 800]))

    expect(large).toBeCloseTo(small * 2, 9)
  })

  it('tek noktaya çökmüş çizimde sıfır döner (çağıran alt sınır uygular)', () => {
    // Sıfıra bölme riski çağıran tarafta `Math.max(..., 1)` ile kapatılıyor.
    expect(getIsometricBoundsDiagonalCm(makeBounds([0, 0, 0], [0, 0, 0]))).toBe(0)
  })
})
