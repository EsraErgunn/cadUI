import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../../../core/model'
import { findNearestWallParallel, getWallParallelPosition } from '../wallSnap'

const POINTS: Point[] = [
  { id: 1, floorId: 1, x: 0, y: 0 },
  { id: 2, floorId: 1, x: 500, y: 0 },
]

const HORIZONTAL_WALL: Wall = { id: 10, floorId: 1, p1Id: 1, p2Id: 2, thickness: 20, height: 250 }

describe('getWallParallelPosition', () => {
  it('follows the wall axis (parallel) when the cursor moves mostly along it', () => {
    const anchor = { x: 100, y: 40 }
    const cursor = { x: 300, y: 45 }
    const position = getWallParallelPosition(HORIZONTAL_WALL, POINTS, anchor, cursor)
    expect(position).toEqual({ x: 300, y: 40 })
  })

  it('switches to the axis perpendicular to the wall when the cursor turns a corner', () => {
    const anchor = { x: 100, y: 40 }
    const cursor = { x: 105, y: 200 }
    const position = getWallParallelPosition(HORIZONTAL_WALL, POINTS, anchor, cursor)
    expect(position).not.toBeNull()
    expect(position!.x).toBeCloseTo(100, 9)
    expect(position!.y).toBeCloseTo(200, 9)
  })

  it('never lets the result overlap the wall — pushes clear by thickness/2 + clearance', () => {
    const anchor = { x: 100, y: 40 }
    // İmleç duvarın EKSENİNE (y=0) çok yakın: dik eksen seçilirse sonuç
    // neredeyse eksende olurdu, güvence onu güvenli tarafa iter.
    const cursor = { x: 100, y: 1 }
    const position = getWallParallelPosition(HORIZONTAL_WALL, POINTS, anchor, cursor)
    expect(position).not.toBeNull()
    const minClearanceCm = HORIZONTAL_WALL.thickness / 2 + 5
    expect(Math.abs(position!.y)).toBeGreaterThanOrEqual(minClearanceCm - 1e-9)
  })

  it('returns null for a degenerate wall (missing points)', () => {
    const brokenWall: Wall = { id: 99, floorId: 1, p1Id: 404, p2Id: 405, thickness: 20, height: 250 }
    expect(getWallParallelPosition(brokenWall, POINTS, { x: 0, y: 0 }, { x: 10, y: 10 })).toBeNull()
  })
})

describe('findNearestWallParallel', () => {
  it('locks onto the nearest wall within radius and reports its axis-projected position', () => {
    const found = findNearestWallParallel(
      [HORIZONTAL_WALL],
      POINTS,
      { x: 100, y: 40 },
      { x: 300, y: 45 },
      100,
    )
    expect(found).toEqual({ wallId: 10, position: { x: 300, y: 40 } })
  })

  it('returns null when no wall is within radius', () => {
    const found = findNearestWallParallel(
      [HORIZONTAL_WALL],
      POINTS,
      { x: 100, y: 400 },
      { x: 300, y: 405 },
      50,
    )
    expect(found).toBeNull()
  })
})
