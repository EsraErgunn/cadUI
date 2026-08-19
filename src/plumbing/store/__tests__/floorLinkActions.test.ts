import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../../core/model'
import type { Floor } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { DEFAULT_PIPE_TYPE_NAME } from '../../core/pipeTypes'
import { commitDraftFloorLink } from '../floorLinkActions'
import { usePlumbingUiStore } from '../plumbingUiStore'

const FLOOR_HEIGHT_CM = 250
const UPPER_FLOOR_ID = 100

function resetCadState(overrides: { floors?: Floor[] } = {}) {
  useCadStore.setState({
    floors: overrides.floors ?? [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME, heightCm: FLOOR_HEIGHT_CM, isBasement: false },
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: FLOOR_HEIGHT_CM, isBasement: false },
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
  usePlumbingUiStore.setState({ draftLine: null, pendingFloorLink: null, activePipeTypeName: DEFAULT_PIPE_TYPE_NAME })
}

beforeEach(() => resetCadState())

/** Zincirde zaten yazılmış bir adım + o adımın ucuna oturan bir taslak — ok
 *  tuşuyla kat bağlamanın gerçek koşulu (`startTarget.kind === 'linePoint'`). */
function draftFromWrittenStep(startHeightCm: number, endHeightCm: number) {
  const written = useCadStore.getState().addLine({
    kind: 'pipe',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    pipe: { startHeightCm, endHeightCm, description: '' },
  })
  if (!written) throw new Error('addLine reddedildi')

  usePlumbingUiStore.setState({
    draftLine: {
      kind: 'pipe',
      anchor: { x: 100, y: 0 },
      startTarget: { kind: 'linePoint', lineId: written.lineId, pointId: written.endPointId },
      elevationCm: endHeightCm,
      steps: [],
    },
  })
  return written
}

describe('commitDraftFloorLink — üst kata çıkışta oda yüksekliği', () => {
  it('yukarı yönde borunun ÇIKTIĞI ucu mevcut katın tavanına çeker', () => {
    const written = draftFromWrittenStep(0, 30)

    expect(commitDraftFloorLink('up')).toBe(true)

    const line = useCadStore.getState().installationLines.find((candidate) => candidate.id === written.lineId)
    expect(line?.pipe?.endHeightCm).toBe(FLOOR_HEIGHT_CM)
    expect(line?.pipe?.startHeightCm).toBe(0)
  })

  it('aşağı yönde borunun kotuna DOKUNMAZ', () => {
    const written = draftFromWrittenStep(0, 30)

    expect(commitDraftFloorLink('down')).toBe(true)

    const line = useCadStore.getState().installationLines.find((candidate) => candidate.id === written.lineId)
    expect(line?.pipe?.endHeightCm).toBe(30)
  })

  it('yeni kata geçilen taslak SIFIR kottan başlar — yalnız terk edilen uç yükselir', () => {
    draftFromWrittenStep(0, 30)

    commitDraftFloorLink('up')

    expect(usePlumbingUiStore.getState().draftLine?.elevationCm).toBe(0)
  })
})
