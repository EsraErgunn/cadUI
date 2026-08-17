import { describe, expect, it } from 'vitest'

import { snapToOrthogonalAxis } from '../angleSnap'

describe('snapToOrthogonalAxis', () => {
  it('snaps a near-horizontal drag to pure horizontal', () => {
    const anchor = { x: 0, y: 0 }
    expect(snapToOrthogonalAxis(anchor, { x: 300, y: 20 })).toEqual({ x: 300, y: 0 })
  })

  it('snaps a near-vertical drag to pure vertical', () => {
    const anchor = { x: 0, y: 0 }
    const result = snapToOrthogonalAxis(anchor, { x: 20, y: 300 })
    expect(result.x).toBeCloseTo(0, 9)
    expect(result.y).toBeCloseTo(300, 9)
  })

  it('never leaves a diagonal result, even for a perfect 45° cursor (no free zone left)', () => {
    const anchor = { x: 0, y: 0 }
    const result = snapToOrthogonalAxis(anchor, { x: 100, y: 100 })
    expect(result.x === 0 || result.y === 0).toBe(true)
  })
})
