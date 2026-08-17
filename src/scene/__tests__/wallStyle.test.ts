import { describe, expect, it } from 'vitest'

import { getWallLineWidthPx } from '../wallStyle'

const THICKNESS_CM = 20

describe('getWallLineWidthPx', () => {
  it('kalınlığı `cm × zoom` ile piksele çevirir — plan fiziksel olarak doğru okunur', () => {
    expect(getWallLineWidthPx(THICKNESS_CM, 1)).toBe(20)
    expect(getWallLineWidthPx(THICKNESS_CM, 2)).toBe(40)
    expect(getWallLineWidthPx(THICKNESS_CM, 0.5)).toBe(10)
  })

  it('uzaklaşınca 3 px altına düşmez — duvar kaybolmasın', () => {
    // En uzak zoom (%10): gerçek kalınlık 2 px'e denk geliyordu.
    expect(getWallLineWidthPx(THICKNESS_CM, 0.1)).toBe(3)
    // Taban tam 3 px'e denk gelen zoom'da henüz devrede değil.
    expect(getWallLineWidthPx(THICKNESS_CM, 0.15)).toBeCloseTo(3)
  })

  it('ince duvar tabana daha erken dayanır', () => {
    const thinCm = 8
    expect(getWallLineWidthPx(thinCm, 0.3)).toBe(3)
    expect(getWallLineWidthPx(thinCm, 0.5)).toBe(4)
  })
})
