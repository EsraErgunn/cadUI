import { describe, expect, it } from 'vitest'

import type { FloorPipeLink } from '../../../core/model'
import { getFloorLinkAnchoredPointIds } from '../lineCornerLink'

describe('getFloorLinkAnchoredPointIds', () => {
  it('bir linkin her iki ucunu da çapa sayar', () => {
    const links: FloorPipeLink[] = [
      { id: 1, belowFloorId: 10, aboveFloorId: 20, belowPointId: 100, abovePointId: 200, position: { x: 0, y: 0 } },
    ]

    const anchored = getFloorLinkAnchoredPointIds(links)

    expect(anchored.has(100)).toBe(true)
    expect(anchored.has(200)).toBe(true)
    expect(anchored.has(300)).toBe(false)
  })

  it('link yoksa boş küme döner', () => {
    expect(getFloorLinkAnchoredPointIds([]).size).toBe(0)
  })
})
