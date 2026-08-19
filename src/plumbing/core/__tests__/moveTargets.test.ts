import { describe, expect, it } from 'vitest'

import type { FloorPipeLink } from '../../../core/model'
import type { InstallationLine } from '../installationModel'
import { resolveMoveTargets } from '../moveTargets'
import { DEFAULT_PIPE_TYPE_NAME } from '../pipeTypes'

const LINE: InstallationLine = {
  id: 1,
  floorId: 10,
  kind: 'pipe',
  pipeTypeName: DEFAULT_PIPE_TYPE_NAME,
  points: [
    { id: 100, position: { x: 0, y: 0 } },
    { id: 101, position: { x: 0, y: 0 } },
  ],
  segments: [{ id: 200, fromPointId: 100, toPointId: 101 }],
  pipe: { startHeightCm: 0, endHeightCm: 50, description: '' },
}

const LINK: FloorPipeLink = {
  id: 900,
  belowFloorId: 10,
  aboveFloorId: 20,
  belowPointId: 101,
  abovePointId: 500,
  position: { x: 0, y: 0 },
}

describe('resolveMoveTargets — floor-link çapası', () => {
  it('floor-link ucu içeren hat DOĞRUDAN seçili olsa bile o nokta taşınmaz', () => {
    const targets = resolveMoveTargets([LINE], [], [LINK], [], [1])

    expect(targets.pointIds.has(100)).toBe(true)
    expect(targets.pointIds.has(101)).toBe(false)
  })

  it('link yoksa hattın tüm noktaları normal şekilde taşınır', () => {
    const targets = resolveMoveTargets([LINE], [], [], [], [1])

    expect(targets.pointIds.has(100)).toBe(true)
    expect(targets.pointIds.has(101)).toBe(true)
  })
})
