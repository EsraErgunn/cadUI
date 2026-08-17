import { describe, expect, it } from 'vitest'

import { projectOntoClosestOrthogonalAxis } from '../orthogonalAxis'

describe('projectOntoClosestOrthogonalAxis', () => {
  const anchor = { x: 100, y: 100 }

  it('picks the base axis when the cursor sits closer to it than to the perpendicular one', () => {
    const cursor = { x: 250, y: 110 }
    expect(projectOntoClosestOrthogonalAxis(0, anchor, cursor)).toEqual({ x: 250, y: 100 })
  })

  it('picks the perpendicular axis when the cursor sits closer to it', () => {
    const cursor = { x: 110, y: 250 }
    const result = projectOntoClosestOrthogonalAxis(0, anchor, cursor)
    expect(result.x).toBeCloseTo(100, 9)
    expect(result.y).toBeCloseTo(250, 9)
  })

  it('never returns a diagonal point — result always lies on one of the two axes', () => {
    const cursor = { x: 100 + 37, y: 100 + 41 }
    const result = projectOntoClosestOrthogonalAxis(0, anchor, cursor)
    const onBaseAxis = Math.abs(result.y - anchor.y) < 1e-9
    const onPerpendicularAxis = Math.abs(result.x - anchor.x) < 1e-9
    expect(onBaseAxis || onPerpendicularAxis).toBe(true)
  })

  it('rotates both candidate axes with a non-zero base angle (wall not aligned to world axes)', () => {
    // 30°'lik bir duvar: paralel eksen (30°) ve dik eksen (120°) aday.
    const cursor = { x: anchor.x + 100 * Math.cos(30 * (Math.PI / 180)), y: anchor.y + 100 * Math.sin(30 * (Math.PI / 180)) }
    const result = projectOntoClosestOrthogonalAxis(30, anchor, cursor)
    expect(result.x).toBeCloseTo(cursor.x, 6)
    expect(result.y).toBeCloseTo(cursor.y, 6)
  })

  it('returns the anchor itself when the cursor is exactly on it', () => {
    expect(projectOntoClosestOrthogonalAxis(0, anchor, { ...anchor })).toEqual(anchor)
  })
})
