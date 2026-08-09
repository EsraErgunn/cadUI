import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../../../core/model'
import { findNearestWallPoint } from '../wallSnap'

const FLOOR_ID = 1

const points: Point[] = [
  { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: FLOOR_ID, x: 1000, y: 0 },
]

const walls: Wall[] = [
  {
    id: 10,
    floorId: FLOOR_ID,
    p1Id: 1,
    p2Id: 2,
    thickness: 20,
    height: 280,
  },
]

describe('findNearestWallPoint', () => {
  it('imlece en yakın duvar ekseni noktasını verir', () => {
    const hit = findNearestWallPoint(walls, points, { x: 400, y: 30 }, 50)

    expect(hit).toEqual({ wallId: 10, position: { x: 400, y: 0 } })
  })

  it('yarıçap dışında null döner', () => {
    expect(findNearestWallPoint(walls, points, { x: 400, y: 100 }, 50)).toBeNull()
  })

  it('izdüşüm duvar UÇLARININ dışına taşmaz', () => {
    const hit = findNearestWallPoint(walls, points, { x: -20, y: 5 }, 50)

    expect(hit?.position).toEqual({ x: 0, y: 0 })
  })

  it('hiç duvar yoksa null döner', () => {
    expect(findNearestWallPoint([], points, { x: 400, y: 0 }, 50)).toBeNull()
  })
})
