import { describe, expect, it } from 'vitest'

import type { FloorPipeLink } from '../../../core/model'
import type { InstallationConnection, InstallationLine } from '../installationModel'
import { DEFAULT_PIPE_TYPE_NAME } from '../pipeTypes'
import { resolvePipeResizeShift } from '../resizeTargets'

const FLOOR_ID = 10

function makeLine(id: number, pointIds: [number, number], overrides: Partial<InstallationLine> = {}): InstallationLine {
  return {
    id,
    floorId: FLOOR_ID,
    kind: 'pipe',
    pipeTypeName: DEFAULT_PIPE_TYPE_NAME,
    points: [
      { id: pointIds[0], position: { x: 0, y: 0 } },
      { id: pointIds[1], position: { x: 100, y: 0 } },
    ],
    segments: [{ id: id * 1000, fromPointId: pointIds[0], toPointId: pointIds[1] }],
    pipe: { startHeightCm: 0, endHeightCm: 0, description: '' },
    ...overrides,
  }
}

/** Boyu değişen boru (1) → devam borusu (2, ucunda vana) → ikinci devam (3, ucunda sayaç). */
const RESIZED = makeLine(1, [100, 101])
const NEXT = makeLine(2, [200, 201], {
  points: [
    { id: 200, position: { x: 100, y: 0 } },
    { id: 201, position: { x: 100, y: 100 }, inlineElementId: 500 },
  ],
})
const LAST = makeLine(3, [300, 301])
const LINES = [RESIZED, NEXT, LAST]

const CONNECTIONS: InstallationConnection[] = [
  { lineId: 2, end: 'start', target: { kind: 'line', lineId: 1, pointId: 101 } },
  { lineId: 3, end: 'start', target: { kind: 'line', lineId: 2, pointId: 201 } },
  { lineId: 3, end: 'end', target: { kind: 'port', elementId: 600, portId: 'in' } },
]

describe('resolvePipeResizeShift — zincirin tamamı ötelenir', () => {
  it('ucun ötesindeki devam boruları, armatür ve porta bağlı eleman kaymaya katılır', () => {
    const shift = resolvePipeResizeShift(LINES, CONNECTIONS, [], 1, 101)

    expect([...shift.pointIds].sort((a, b) => a - b)).toEqual([200, 201, 300, 301])
    expect([...shift.elementIds].sort((a, b) => a - b)).toEqual([500, 600])
    expect([...shift.lineIds].sort((a, b) => a - b)).toEqual([2, 3])
  })

  it('taşınan ucun KENDİSİ kümede değildir — çağıran onu tam hedefe oturtuyor', () => {
    const shift = resolvePipeResizeShift(LINES, CONNECTIONS, [], 1, 101)

    expect(shift.pointIds.has(101)).toBe(false)
  })

  it('boyu değişen borunun başlangıcı SABİT kalır', () => {
    const shift = resolvePipeResizeShift(LINES, CONNECTIONS, [], 1, 101)

    expect(shift.pointIds.has(100)).toBe(false)
  })
})

describe('resolvePipeResizeShift — kat bağlantısı durağı', () => {
  const LINK: FloorPipeLink = {
    id: 900,
    belowFloorId: FLOOR_ID,
    aboveFloorId: 20,
    belowPointId: 301,
    abovePointId: 800,
    position: { x: 0, y: 0 },
  }

  // Link'in `position`'ı ve karşı kattaki eşi burada kayamaz (K104): o hat
  // RİJİT ötelenmez, kaynaklı ucu (300) gelir ama bağlı ucu (301) yerinde
  // kalır — yani boru ESNER ve öteleme orada biter. Ucundaki sayaç da 301'e
  // bağlı olduğu için kımıldamaz.
  it('FloorPipeLink ucu taşıyan hat ötelenmez, kaynaktan gerilir', () => {
    const shift = resolvePipeResizeShift(LINES, CONNECTIONS, [LINK], 1, 101)

    expect([...shift.pointIds].sort((a, b) => a - b)).toEqual([200, 201, 300])
    expect(shift.pointIds.has(301)).toBe(false)
    expect([...shift.lineIds]).toEqual([2])
    expect(shift.elementIds.has(600)).toBe(false)
  })
})
