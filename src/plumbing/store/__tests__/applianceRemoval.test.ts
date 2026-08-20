import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME, type Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { resetPlumbingHistory } from '../plumbingHistory'

const PIPE_ID = 50
const STUB_ID = 51
const STOVE_ID = 60
const VALVE_ID = 61
/** Kolun oturduğu, borunun zaten var olan uç düğümü. */
const JUNCTION_POINT_ID = 502

/**
 * `placeElementWithStub`'ın ürettiği durumun BİREBİR aynısı: kol ayrı bir hat,
 * bağlantıların İKİSİ de kolda, refakatçi vana ise ANA BORUNUN uç düğümünde
 * (`inlineElementId`) — kolun üstünde değil. Silmenin zor yeri tam olarak bu:
 * vana silinen cihazın hattında durmuyor.
 */
function seedStovePlacedWithStub() {
  useCadStore.setState({
    floors: [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME, heightCm: 300, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    installationElements: [
      {
        id: STOVE_ID,
        floorId: DEFAULT_FLOOR_ID,
        type: 'stove',
        position: { x: 300, y: 200 },
        angleDeg: 0,
        scale: 1,
      },
      {
        id: VALVE_ID,
        floorId: DEFAULT_FLOOR_ID,
        type: 'valve',
        position: { x: 200, y: 200 },
        angleDeg: 0,
        scale: 1,
      },
    ],
    installationLines: [
      {
        id: PIPE_ID,
        floorId: DEFAULT_FLOOR_ID,
        kind: 'pipe',
        pipeTypeName: 'DN25',
        points: [
          { id: 501, position: { x: 0, y: 200 } },
          { id: JUNCTION_POINT_ID, position: { x: 200, y: 200 }, inlineElementId: VALVE_ID },
        ],
        segments: [{ id: 590, fromPointId: 501, toPointId: JUNCTION_POINT_ID }],
      },
      {
        id: STUB_ID,
        floorId: DEFAULT_FLOOR_ID,
        kind: 'applianceStub',
        pipeTypeName: 'DN25',
        points: [
          { id: 511, position: { x: 200, y: 200 } },
          { id: 512, position: { x: 300, y: 200 } },
        ],
        segments: [{ id: 591, fromPointId: 511, toPointId: 512 }],
      },
    ],
    installationConnections: [
      {
        lineId: STUB_ID,
        end: 'start',
        target: { kind: 'line', lineId: PIPE_ID, pointId: JUNCTION_POINT_ID },
      },
      { lineId: STUB_ID, end: 'end', target: { kind: 'port', elementId: STOVE_ID, portId: 'in' } },
    ],
    floorPipeLinks: [],
    nextUniqueId: 1000,
    revision: 0,
  })
  // Tesisat geçmişi cadStore'un zundo'su DEĞİL, kendi aynası (plumbingHistory).
  resetPlumbingHistory({
    installationElements: useCadStore.getState().installationElements,
    installationLines: useCadStore.getState().installationLines,
    installationConnections: useCadStore.getState().installationConnections,
    floorPipeLinks: [],
  })
}

const lineIds = (): Id[] => useCadStore.getState().installationLines.map((line) => line.id)
const elementIds = (): Id[] => useCadStore.getState().installationElements.map((el) => el.id)

beforeEach(seedStovePlacedWithStub)

describe('yakıcı cihaz silinince', () => {
  it('cihaz KOLU da gider — sahipsiz bir parça geride kalmaz', () => {
    useCadStore.getState().removeElements([STOVE_ID])

    expect(lineIds()).toEqual([PIPE_ID])
  })

  it('kolun refakatçi VANASI da gider', () => {
    useCadStore.getState().removeElements([STOVE_ID])

    expect(elementIds()).toEqual([])
  })

  it('vananın oturduğu düğüm boşa çıkar, boru durur', () => {
    useCadStore.getState().removeElements([STOVE_ID])

    const pipe = useCadStore.getState().installationLines.find((line) => line.id === PIPE_ID)
    expect(pipe).toBeDefined()
    expect(pipe?.points.some((point) => point.inlineElementId !== undefined)).toBe(false)
  })

  it('kola ait bağlantı kaydı kalmaz', () => {
    useCadStore.getState().removeElements([STOVE_ID])

    expect(useCadStore.getState().installationConnections).toEqual([])
  })

  it('tek Ctrl+Z hepsini geri getirir', () => {
    useCadStore.getState().removeElements([STOVE_ID])
    useCadStore.getState().undoPlumbing()

    expect(lineIds().sort()).toEqual([PIPE_ID, STUB_ID])
    expect(elementIds().sort()).toEqual([STOVE_ID, VALVE_ID])
  })
})
