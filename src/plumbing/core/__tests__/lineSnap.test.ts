import { describe, expect, it } from 'vitest'

import type { InstallationConnection, InstallationLine } from '../installationModel'
import {
  collectOpenEndPointIds,
  findNearestLineCorner,
  findNearestPointOnLines,
} from '../lineSnap'
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

/**
 * Kot adımı sonrası gerçek durum: yatay boru (0 cm) P'de bitiyor, kolon aynı
 * P'de 0 → 200 çıkıyor ve kolonun DİBİ yatay borunun ucuna bağlı. Açık kalan
 * tek uç kolonun tepesi (id 101).
 */
const RISER_ON_HORIZONTAL: InstallationLine = {
  ...RISER,
  pipe: { startHeightCm: 0, endHeightCm: 200, description: '' },
}
const HORIZONTAL_INTO_RISER: InstallationLine = {
  ...HORIZONTAL,
  points: [
    { id: 200, position: { x: 300, y: 0 } },
    { id: 201, position: { x: 0, y: 0 } },
  ],
  pipe: { startHeightCm: 0, endHeightCm: 0, description: '' },
}
const RISER_CHAIN = [HORIZONTAL_INTO_RISER, RISER_ON_HORIZONTAL]
const RISER_CHAIN_CONNECTIONS: InstallationConnection[] = [
  { lineId: 1, end: 'start', target: { kind: 'line', lineId: 2, pointId: 201 } },
]

describe('findNearestPointOnLines — çakışan uçlar', () => {
  it('kot adımından sonra AÇIK uç (kolonun tepesi) kazanır', () => {
    const openEndPointIds = collectOpenEndPointIds(RISER_CHAIN, RISER_CHAIN_CONNECTIONS)
    const candidate = findNearestPointOnLines(RISER_CHAIN, { x: 2, y: 1 }, 30, openEndPointIds)

    // Yatay borunun ucu (201) ile kolonun tepesi (101) AYNI x,y'de; çizim
    // kolonun tepesinde bırakıldığı için devam oradan olmalı.
    expect(candidate?.pointId).toBe(101)
  })

  it('açık uç bilgisi verilmezse eski davranış korunur (diziye giriş sırası)', () => {
    const candidate = findNearestPointOnLines(RISER_CHAIN, { x: 2, y: 1 }, 30)

    expect(candidate?.pointId).toBe(201)
  })

  it('yatay boruda köşe yakalaması değişmez', () => {
    const candidate = findNearestPointOnLines([HORIZONTAL], { x: 32, y: 0 }, 30)

    expect(candidate?.pointId).toBe(200)
  })
})

describe('collectOpenEndPointIds', () => {
  it('bağlantı kaydının işaret ettiği uçlar KAPALI sayılır', () => {
    const open = collectOpenEndPointIds(RISER_CHAIN, RISER_CHAIN_CONNECTIONS)

    expect(open.has(101)).toBe(true)
    expect(open.has(201)).toBe(false)
    expect(open.has(100)).toBe(false)
    expect(open.has(200)).toBe(true)
  })
})
