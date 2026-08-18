import { describe, expect, it } from 'vitest'

import { isFixedCompanionValve } from '../elementAttach'
import type { InstallationConnection, InstallationLine } from '../installationModel'

const METER_ID = 10
const VALVE_ID = 11
const FILTER_KIT_ID = 12
const START_POINT_ID = 1
const MIDDLE_POINT_ID = 2
const END_POINT_ID = 3

/** Sayacın portuna bağlı bir hat; başlangıcın HEMEN yanındaki düğümde bir armatür var. */
function makeLine(inlineElementId: number): InstallationLine {
  return {
    id: 100,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN20',
    points: [
      { id: START_POINT_ID, position: { x: 0, y: 0 } },
      { id: MIDDLE_POINT_ID, position: { x: 50, y: 0 }, inlineElementId },
      { id: END_POINT_ID, position: { x: 200, y: 0 } },
    ],
    segments: [
      { id: 200, fromPointId: START_POINT_ID, toPointId: MIDDLE_POINT_ID },
      { id: 201, fromPointId: MIDDLE_POINT_ID, toPointId: END_POINT_ID },
    ],
  }
}

const meterConnection: InstallationConnection = {
  lineId: 100,
  end: 'start',
  target: { kind: 'port', elementId: METER_ID, portId: 'output' },
}

describe('isFixedCompanionValve', () => {
  it('sayaca bitişik düğümdeki otomatik VANA sabittir', () => {
    expect(isFixedCompanionValve([makeLine(VALVE_ID)], [meterConnection], VALVE_ID, 'valve')).toBe(
      true,
    )
  })

  it('AYNI yerdeki filtre kiti sabit DEĞİLDİR — boru üzerinde kaydırılabilir', () => {
    expect(
      isFixedCompanionValve([makeLine(FILTER_KIT_ID)], [meterConnection], FILTER_KIT_ID, 'filterKit'),
    ).toBe(false)
  })

  it('hattın tam UCUNDAKİ filtre kiti de sabit değildir', () => {
    const line = makeLine(FILTER_KIT_ID)
    const endLine: InstallationLine = {
      ...line,
      points: [
        { id: START_POINT_ID, position: { x: 0, y: 0 }, inlineElementId: FILTER_KIT_ID },
        { id: END_POINT_ID, position: { x: 200, y: 0 } },
      ],
      segments: [{ id: 200, fromPointId: START_POINT_ID, toPointId: END_POINT_ID }],
    }
    expect(isFixedCompanionValve([endLine], [], FILTER_KIT_ID, 'filterKit')).toBe(false)
  })
})
