import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../../../core/model'
import {
  findNearestWallCorner,
  findNearestWallFace,
  findNearestWallParallel,
  getWallParallelPosition,
} from '../wallSnap'

const POINTS: Point[] = [
  { id: 1, floorId: 1, x: 0, y: 0 },
  { id: 2, floorId: 1, x: 500, y: 0 },
]

const HORIZONTAL_WALL: Wall = { id: 10, floorId: 1, p1Id: 1, p2Id: 2, thickness: 20, height: 250 }

describe('getWallParallelPosition', () => {
  it('follows the wall axis (parallel) when the cursor moves mostly along it', () => {
    const anchor = { x: 100, y: 40 }
    const cursor = { x: 300, y: 45 }
    const position = getWallParallelPosition(HORIZONTAL_WALL, POINTS, anchor, cursor, 2)
    expect(position).toEqual({ x: 300, y: 40 })
  })

  it('switches to the axis perpendicular to the wall when the cursor turns a corner', () => {
    const anchor = { x: 100, y: 40 }
    const cursor = { x: 105, y: 200 }
    const position = getWallParallelPosition(HORIZONTAL_WALL, POINTS, anchor, cursor, 2)
    expect(position).not.toBeNull()
    expect(position!.x).toBeCloseTo(100, 9)
    expect(position!.y).toBeCloseTo(200, 9)
  })

  it('never lets the result overlap the wall — pushes clear by thickness/2 + clearance', () => {
    const anchor = { x: 100, y: 40 }
    // İmleç duvarın EKSENİNE (y=0) çok yakın: dik eksen seçilirse sonuç
    // neredeyse eksende olurdu, güvence onu güvenli tarafa iter.
    const cursor = { x: 100, y: 1 }
    const position = getWallParallelPosition(HORIZONTAL_WALL, POINTS, anchor, cursor, 5)
    expect(position).not.toBeNull()
    const minClearanceCm = HORIZONTAL_WALL.thickness / 2 + 5
    expect(Math.abs(position!.y)).toBeGreaterThanOrEqual(minClearanceCm - 1e-9)
  })

  it('accepts a tiny (pixel-sized) clearance — the pipe hugs the wall face almost flush', () => {
    const anchor = { x: 100, y: 40 }
    const cursor = { x: 100, y: 1 }
    const position = getWallParallelPosition(HORIZONTAL_WALL, POINTS, anchor, cursor, 0.2)
    expect(position).not.toBeNull()
    expect(Math.abs(position!.y)).toBeCloseTo(HORIZONTAL_WALL.thickness / 2 + 0.2, 9)
  })

  it('returns null for a degenerate wall (missing points)', () => {
    const brokenWall: Wall = { id: 99, floorId: 1, p1Id: 404, p2Id: 405, thickness: 20, height: 250 }
    expect(getWallParallelPosition(brokenWall, POINTS, { x: 0, y: 0 }, { x: 10, y: 10 }, 2)).toBeNull()
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
      2,
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
      2,
    )
    expect(found).toBeNull()
  })
})

describe('findNearestWallCorner', () => {
  it('never sits exactly on the corner — the wall (corners included) is forbidden territory', () => {
    // En yakın köşe (0,0); imleç +y tarafında → sonuç duvarın payını
    // (thickness/2 + gapCm = 10 + 2) temizleyerek +y'ye itilir.
    const corner = findNearestWallCorner([HORIZONTAL_WALL], POINTS, { x: 3, y: 4 }, 10, 2)
    expect(corner).toEqual({ x: 0, y: 12 })
  })

  it('picks the closer of two endpoints and pushes it clear on the cursor’s side', () => {
    const corner = findNearestWallCorner([HORIZONTAL_WALL], POINTS, { x: 498, y: -1 }, 10, 2)
    expect(corner).toEqual({ x: 500, y: -12 })
  })

  it('never snaps to the wall midpoint — only real corners are candidates', () => {
    const corner = findNearestWallCorner([HORIZONTAL_WALL], POINTS, { x: 250, y: 0.5 }, 10, 2)
    expect(corner).toBeNull()
  })

  it('returns null outside tolerance', () => {
    const corner = findNearestWallCorner([HORIZONTAL_WALL], POINTS, { x: 3, y: 4 }, 1, 2)
    expect(corner).toBeNull()
  })

  it('at a T/X junction, clears EVERY wall sharing that corner — not just the nearest one', () => {
    const junctionPoints: Point[] = [...POINTS, { id: 3, floorId: 1, x: 500, y: 300 }]
    const verticalWall: Wall = { id: 11, floorId: 1, p1Id: 2, p2Id: 3, thickness: 20, height: 250 }
    // İmleç köşenin (500,0) sağ-alt çeyreğinde: sonuç HER İKİ duvarın payını
    // da (thickness/2 + gapCm = 12) temizlemeli.
    const corner = findNearestWallCorner(
      [HORIZONTAL_WALL, verticalWall],
      junctionPoints,
      { x: 510, y: -5 },
      20,
      2,
    )
    expect(corner).toEqual({ x: 512, y: -12 })
  })
})

describe('findNearestWallFace', () => {
  it('pulls a cursor floating away from the wall onto its near face (magnetic, not passive)', () => {
    // Duvar y=0 ekseninde, kalınlık 20 → yüz y=10'da. İmleç y=25'te, yarıçap
    // 30 içinde: yalnız TOO-CLOSE koruması olsaydı hiç kaymazdı, mıknatıs
    // olduğu için yüze ÇEKİLİR.
    const face = findNearestWallFace([HORIZONTAL_WALL], POINTS, { x: 200, y: 25 }, 30, 2)
    expect(face).not.toBeNull()
    expect(face!.x).toBeCloseTo(200, 9)
    expect(face!.y).toBeCloseTo(12, 9)
  })

  it('picks the face on the cursor’s own side of the wall', () => {
    const face = findNearestWallFace([HORIZONTAL_WALL], POINTS, { x: 200, y: -25 }, 30, 2)
    expect(face).not.toBeNull()
    expect(face!.y).toBeCloseTo(-12, 9)
  })

  it('returns null outside the magnetic radius', () => {
    const face = findNearestWallFace([HORIZONTAL_WALL], POINTS, { x: 200, y: 100 }, 30, 2)
    expect(face).toBeNull()
  })
})
