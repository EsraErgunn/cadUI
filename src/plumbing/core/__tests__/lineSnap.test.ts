import { describe, expect, it } from 'vitest'

import type { InstallationLine } from '../installationModel'
import { findNearestLineCorner } from '../lineSnap'
import { DEFAULT_PIPE_TYPE_NAME } from '../pipeTypes'

/** Plan boyu SIFIR dikey boru (K102): iki noktası da aynı yerde. */
const RISER: InstallationLine = {
  id: 1,
  floorId: 10,
  kind: 'pipe',
  pipeTypeName: DEFAULT_PIPE_TYPE_NAME,
  points: [
    { id: 100, position: { x: 0, y: 0 } },
    { id: 101, position: { x: 0, y: 0 } },
  ],
  segments: [{ id: 1000, fromPointId: 100, toPointId: 101 }],
  pipe: { startHeightCm: 0, endHeightCm: 200, description: '' },
}

/** Kolonun ucundan devam eden yatay boru — sürüklenen köşe bunun başı. */
const HORIZONTAL: InstallationLine = {
  id: 2,
  floorId: 10,
  kind: 'pipe',
  pipeTypeName: DEFAULT_PIPE_TYPE_NAME,
  points: [
    { id: 200, position: { x: 30, y: 0 } },
    { id: 201, position: { x: 300, y: 0 } },
  ],
  segments: [{ id: 2000, fromPointId: 200, toPointId: 201 }],
  pipe: { startHeightCm: 200, endHeightCm: 200, description: '' },
}

const LINES = [RISER, HORIZONTAL]
/** Sürüklenen köşeyle birlikte giden noktalar (kaynaklı uç + kendisi). */
const DRAGGED = new Set([200, 101])

describe('findNearestLineCorner', () => {
  it('yarıçap içindeki köşeye TAM konumuyla yapışır', () => {
    const hit = findNearestLineCorner(LINES, { x: 4, y: 3 }, 20, DRAGGED)

    expect(hit).toEqual({ lineId: 1, pointId: 100, position: { x: 0, y: 0 } })
  })

  it('sürüklenen köşenin kendisi ve kaynaklı komşusu aday DEĞİL', () => {
    // İmleç 200'ün tam üstünde; elenmeseydi köşe kendi kendine yapışırdı.
    const hit = findNearestLineCorner(LINES, { x: 30, y: 0 }, 5, DRAGGED)

    expect(hit).toBeNull()
  })

  it('segment GÖVDESİ aday değil — yalnız köşeler', () => {
    // (150, 0) yatay borunun tam ortası: hiçbir köşeye yarıçap kadar yakın değil.
    expect(findNearestLineCorner(LINES, { x: 150, y: 0 }, 20, DRAGGED)).toBeNull()
  })

  it('yarıçap dışındaki köşe yakalanmaz', () => {
    expect(findNearestLineCorner(LINES, { x: 100, y: 100 }, 20, DRAGGED)).toBeNull()
  })

  it('iki aday varsa en YAKINI kazanır', () => {
    const hit = findNearestLineCorner(LINES, { x: 290, y: 0 }, 400, DRAGGED)

    expect(hit?.pointId).toBe(201)
  })
})
