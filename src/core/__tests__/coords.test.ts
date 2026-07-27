import { describe, expect, it } from 'vitest'

import {
  formatLengthAsMeters,
  planToThree,
  threeToElevation,
  threeToPlan,
} from '../coords'

describe('planToThree', () => {
  // Bu test aynalama hatasını yakalar: z işareti ters yazılırsa plan aynalanır
  // ve hata ancak izometrik görünümde fark edilir.
  it('plan y ekseni three z eksenine TERS işaretle gider', () => {
    expect(planToThree({ x: 300, y: 200 })).toEqual([300, 0, -200])
  })

  it('elevation three y eksenine gider', () => {
    expect(planToThree({ x: 0, y: 0 }, 250)).toEqual([0, 250, 0])
  })
})

describe('threeToPlan', () => {
  it('planToThree ile gidiş-dönüş kimliği korur', () => {
    const point = { x: -125.5, y: 340.25 }
    expect(threeToPlan(planToThree(point, 90))).toEqual(point)
  })

  it('elevation ayrı okunur', () => {
    expect(threeToElevation(planToThree({ x: 0, y: 0 }, 90))).toBe(90)
  })
})

describe('formatLengthAsMeters', () => {
  it('cm tutulan uzunluğu metre olarak gösterir', () => {
    expect(formatLengthAsMeters(350)).toBe('3.50')
    expect(formatLengthAsMeters(50)).toBe('0.50')
  })
})
