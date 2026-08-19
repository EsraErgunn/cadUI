import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../../core/model'
import type { Floor } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { DEFAULT_PIPE_TYPE_NAME } from '../../core/pipeTypes'
import { commitDraftElevationTo } from '../pipeElevationActions'
import { usePlumbingUiStore } from '../plumbingUiStore'

/** Kat tavanı testte kolayca aşılabilsin diye küçük (ama geçerli, 200-600 cm) bir yükseklik. */
const FLOOR_HEIGHT_CM = 200
const UPPER_FLOOR_ID = 100

function resetCadState(overrides: { floors?: Floor[] } = {}) {
  useCadStore.setState({
    floors: overrides.floors ?? [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME, heightCm: FLOOR_HEIGHT_CM, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    floorPipeLinks: [],
    nextUniqueId: 1000,
    revision: 0,
  })
  useCadStore.temporal.getState().clear()
}

function startDraft(elevationCm = 0) {
  usePlumbingUiStore.setState({
    draftLine: { kind: 'pipe', anchor: { x: 0, y: 0 }, startTarget: null, elevationCm, steps: [] },
    activePipeTypeName: DEFAULT_PIPE_TYPE_NAME,
    pendingFloorLink: null,
  })
}

beforeEach(() => {
  resetCadState({})
})

describe('commitDraftElevationTo — kat tavanı içinde kalan normal kot', () => {
  it('tavanın altındaki kot yalnızca aktif katta bir boru yazar, kat geçişi olmaz', () => {
    startDraft()

    expect(commitDraftElevationTo(150)).toBe(true)

    const cad = useCadStore.getState()
    expect(cad.installationLines).toHaveLength(1)
    expect(cad.installationLines[0].pipe?.endHeightCm).toBe(150)
    expect(cad.floorPipeLinks).toHaveLength(0)
    expect(cad.activeFloorId).toBe(DEFAULT_FLOOR_ID)
  })

  it('tam tavanda biten kot da kat geçişi TETİKLEMEZ', () => {
    startDraft()

    expect(commitDraftElevationTo(FLOOR_HEIGHT_CM)).toBe(true)

    const cad = useCadStore.getState()
    expect(cad.installationLines[0].pipe?.endHeightCm).toBe(FLOOR_HEIGHT_CM)
    expect(cad.floorPipeLinks).toHaveLength(0)
    expect(cad.activeFloorId).toBe(DEFAULT_FLOOR_ID)
  })
})

describe('commitDraftElevationTo — kat tavanını aşan kot', () => {
  it('tavanı aşan kot bu katta tavana kadar yazar, kalanı YENİ bir üst katta devam ettirir', () => {
    startDraft()

    const overflowCm = 150
    expect(commitDraftElevationTo(FLOOR_HEIGHT_CM + overflowCm)).toBe(true)

    const cad = useCadStore.getState()
    expect(cad.floors).toHaveLength(2)
    expect(cad.installationLines).toHaveLength(2)

    const belowLine = cad.installationLines.find((line) => line.floorId === DEFAULT_FLOOR_ID)
    const aboveFloorId = cad.floors[1].id
    const aboveLine = cad.installationLines.find((line) => line.floorId === aboveFloorId)

    expect(belowLine?.pipe?.endHeightCm).toBe(FLOOR_HEIGHT_CM)
    expect(aboveLine?.pipe?.startHeightCm).toBe(0)
    expect(aboveLine?.pipe?.endHeightCm).toBe(overflowCm)

    expect(cad.floorPipeLinks).toHaveLength(1)
    expect(cad.floorPipeLinks[0].belowFloorId).toBe(DEFAULT_FLOOR_ID)
    expect(cad.floorPipeLinks[0].aboveFloorId).toBe(aboveFloorId)
    expect(cad.floorPipeLinks[0].belowPointId).toBe(belowLine?.points[1].id)
    expect(cad.floorPipeLinks[0].abovePointId).toBe(aboveLine?.points[0].id)

    // Otomatik olarak yeni kata geçilir — kullanıcı beklemeden devam edebilsin.
    expect(cad.activeFloorId).toBe(aboveFloorId)
  })

  it('iki kat tavanını birden aşan kot ZİNCİRLEME iki FloorPipeLink üretir', () => {
    resetCadState({
      floors: [
        { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME, heightCm: FLOOR_HEIGHT_CM, isBasement: false },
        { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: FLOOR_HEIGHT_CM, isBasement: false },
      ],
    })
    startDraft()

    // Zemin (200) + 1. Kat (200) tavanlarını aşıp üçüncü (yeni, varsayılan
    // DEFAULT_FLOOR_HEIGHT_CM) katta 50cm ile biten bir hedef.
    const targetCm = FLOOR_HEIGHT_CM + FLOOR_HEIGHT_CM + 50
    expect(commitDraftElevationTo(targetCm)).toBe(true)

    const cad = useCadStore.getState()
    expect(cad.floors).toHaveLength(3)
    expect(cad.floorPipeLinks).toHaveLength(2)
    expect(cad.installationLines).toHaveLength(3)

    const topFloorId = cad.floors[2].id
    expect(cad.floors[2].heightCm).toBe(DEFAULT_FLOOR_HEIGHT_CM)
    expect(cad.activeFloorId).toBe(topFloorId)

    const topLine = cad.installationLines.find((line) => line.floorId === topFloorId)
    expect(topLine?.pipe?.endHeightCm).toBe(50)

    expect(cad.floorPipeLinks.map((link) => [link.belowFloorId, link.aboveFloorId])).toEqual([
      [DEFAULT_FLOOR_ID, UPPER_FLOOR_ID],
      [UPPER_FLOOR_ID, topFloorId],
    ])
  })
})
