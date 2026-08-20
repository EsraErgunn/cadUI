import { describe, expect, it } from 'vitest'

import type { IsometricBounds } from '../isometricModel'
import { ISOMETRIC_ANGLES_DEFAULT } from '../isometricProjection'
import { getIsometricScreenExtentCm } from '../isometricScene'

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

describe('getIsometricScreenExtentCm', () => {
  it('kutunun izdüşümü iki eksende de yer kaplar', () => {
    const extent = getIsometricScreenExtentCm(
      makeBounds([0, 0, 0], [1000, 600, 800]),
      ISOMETRIC_ANGLES_DEFAULT,
    )

    expect(extent.widthCm).toBeGreaterThan(0)
    expect(extent.heightCm).toBeGreaterThan(0)
  })

  it('ÖTELEME çerçeveyi değiştirmez — yalnız boyut sayılır', () => {
    // Kamera hedefi ayrıca merkezden geliyor; extent yalnız ölçek içindir.
    const atOrigin = getIsometricScreenExtentCm(
      makeBounds([0, 0, 0], [1000, 600, 800]),
      ISOMETRIC_ANGLES_DEFAULT,
    )
    const shifted = getIsometricScreenExtentCm(
      makeBounds([5000, -300, 2000], [6000, 300, 2800]),
      ISOMETRIC_ANGLES_DEFAULT,
    )

    expect(shifted.widthCm).toBeCloseTo(atOrigin.widthCm, 6)
    expect(shifted.heightCm).toBeCloseTo(atOrigin.heightCm, 6)
  })

  it('büyüyen çizim daha geniş çerçeve ister', () => {
    const small = getIsometricScreenExtentCm(
      makeBounds([0, 0, 0], [500, 300, 400]),
      ISOMETRIC_ANGLES_DEFAULT,
    )
    const large = getIsometricScreenExtentCm(
      makeBounds([0, 0, 0], [1000, 600, 800]),
      ISOMETRIC_ANGLES_DEFAULT,
    )

    expect(large.widthCm).toBeCloseTo(small.widthCm * 2, 6)
    expect(large.heightCm).toBeCloseTo(small.heightCm * 2, 6)
  })

  it('α = 0 iken kotsuz bir zemin çizimi ekranda YÜKSEKLİK kaplamaz', () => {
    // Zemin düzlemine tam yandan bakılır; çerçeveye sığdırma bu dejenere
    // durumda sıfıra bölmemeli — çağıran taraf en az 1 cm ile korunuyor.
    const extent = getIsometricScreenExtentCm(makeBounds([0, 0, 0], [1000, 0, 800]), {
      alphaDeg: 0,
      betaDeg: 30,
    })

    expect(extent.heightCm).toBeCloseTo(0, 9)
    expect(extent.widthCm).toBeGreaterThan(0)
  })
})
