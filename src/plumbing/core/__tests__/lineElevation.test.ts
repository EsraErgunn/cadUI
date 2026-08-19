import { describe, expect, it } from 'vitest'

import { capElevationToFloor } from '../lineElevation'

describe('capElevationToFloor', () => {
  it('tavanın altındaki hedefi olduğu gibi döner, taşma yoktur', () => {
    expect(capElevationToFloor(150, 300)).toEqual({ endHeightCm: 150, overflowCm: 0 })
  })

  it('tam tavanda taşma yoktur', () => {
    expect(capElevationToFloor(300, 300)).toEqual({ endHeightCm: 300, overflowCm: 0 })
  })

  it('tavanı aşan hedef tavanla sınırlanır, fark taşma olur', () => {
    expect(capElevationToFloor(450, 300)).toEqual({ endHeightCm: 300, overflowCm: 150 })
  })
})
