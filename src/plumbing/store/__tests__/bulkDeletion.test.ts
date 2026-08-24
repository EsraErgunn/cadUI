import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME, type Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../core/installationModel'
import { requestRiserDeletion, requestUnitInstallationsDeletion } from '../deletionActions'
import { usePlumbingUiStore } from '../plumbingUiStore'

const UPPER_FLOOR_ID = 2

const SERVICE_BOX_ID = 1
const GROUND_METER_ID = 2
const GROUND_STOVE_ID = 3
const UPPER_METER_ID = 4
const UPPER_STOVE_ID = 5

const TRUNK_LINE_ID = 10
const GROUND_UNIT_LINE_ID = 20
const UPPER_TRUNK_LINE_ID = 30
const UPPER_UNIT_LINE_ID = 40

function makeElement(id: Id, type: InstallationElement['type'], floorId: Id): InstallationElement {
  return { id, floorId, type, position: { x: 0, y: 0 }, angleDeg: 0, scale: 1 }
}

function makeLine(id: Id, floorId: Id, lengthCm: number): InstallationLine {
  return {
    id,
    floorId,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: id * 100, position: { x: 0, y: 0 } },
      { id: id * 100 + 1, position: { x: lengthCm, y: 0 } },
    ],
    segments: [{ id: id * 1000, fromPointId: id * 100, toPointId: id * 100 + 1 }],
  }
}

/**
 * İki katlı, iki daireli tesisat:
 * servis kutusu → gövde → (her katta) sayaç → daire içi → ocak.
 * Gövde iki kata yayılıyor; kolon silmenin kat seçimi olmadığını burası ölçer.
 */
function seedTwoFloorInstallation() {
  const connections: InstallationConnection[] = [
    {
      lineId: TRUNK_LINE_ID,
      end: 'start',
      target: { kind: 'port', elementId: SERVICE_BOX_ID, portId: 'out' },
    },
    {
      lineId: TRUNK_LINE_ID,
      end: 'end',
      target: { kind: 'port', elementId: GROUND_METER_ID, portId: 'in' },
    },
    {
      lineId: GROUND_UNIT_LINE_ID,
      end: 'start',
      target: { kind: 'port', elementId: GROUND_METER_ID, portId: 'out' },
    },
    {
      lineId: GROUND_UNIT_LINE_ID,
      end: 'end',
      target: { kind: 'port', elementId: GROUND_STOVE_ID, portId: 'in' },
    },
    {
      lineId: UPPER_TRUNK_LINE_ID,
      end: 'start',
      target: { kind: 'line', lineId: TRUNK_LINE_ID, pointId: TRUNK_LINE_ID * 100 },
    },
    {
      lineId: UPPER_TRUNK_LINE_ID,
      end: 'end',
      target: { kind: 'port', elementId: UPPER_METER_ID, portId: 'in' },
    },
    {
      lineId: UPPER_UNIT_LINE_ID,
      end: 'start',
      target: { kind: 'port', elementId: UPPER_METER_ID, portId: 'out' },
    },
    {
      lineId: UPPER_UNIT_LINE_ID,
      end: 'end',
      target: { kind: 'port', elementId: UPPER_STOVE_ID, portId: 'in' },
    },
  ]

  useCadStore.setState({
    floors: [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME, heightCm: 300, isBasement: false },
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: 300, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    floorPipeLinks: [],
    installationElements: [
      makeElement(SERVICE_BOX_ID, 'serviceBox', DEFAULT_FLOOR_ID),
      makeElement(GROUND_METER_ID, 'gasMeter', DEFAULT_FLOOR_ID),
      makeElement(GROUND_STOVE_ID, 'stove', DEFAULT_FLOOR_ID),
      makeElement(UPPER_METER_ID, 'gasMeter', UPPER_FLOOR_ID),
      makeElement(UPPER_STOVE_ID, 'stove', UPPER_FLOOR_ID),
    ],
    installationLines: [
      makeLine(TRUNK_LINE_ID, DEFAULT_FLOOR_ID, 400),
      makeLine(GROUND_UNIT_LINE_ID, DEFAULT_FLOOR_ID, 150),
      makeLine(UPPER_TRUNK_LINE_ID, UPPER_FLOOR_ID, 200),
      makeLine(UPPER_UNIT_LINE_ID, UPPER_FLOOR_ID, 100),
    ],
    installationConnections: connections,
    revision: 0,
  })
}

function pending() {
  return usePlumbingUiStore.getState().pendingCascadeDeletion
}

beforeEach(() => {
  usePlumbingUiStore.getState().cancelCascadeDeletion()
  seedTwoFloorInstallation()
})

describe('requestRiserDeletion', () => {
  it('gövdeyi TÜM katlarda toplar — kat seçimi yok', () => {
    requestRiserDeletion()

    expect(pending()?.kind).toBe('riserNetwork')
    expect(pending()?.lineIds).toEqual(
      expect.arrayContaining([TRUNK_LINE_ID, UPPER_TRUNK_LINE_ID]),
    )
    expect(pending()?.floorIds).toEqual(
      expect.arrayContaining([DEFAULT_FLOOR_ID, UPPER_FLOOR_ID]),
    )
  })

  it('sayaçlara ve daire içine DOKUNMAZ', () => {
    requestRiserDeletion()

    expect(pending()?.elementIds).not.toContain(GROUND_METER_ID)
    expect(pending()?.elementIds).not.toContain(UPPER_METER_ID)
    expect(pending()?.elementIds).not.toContain(GROUND_STOVE_ID)
    expect(pending()?.lineIds).not.toContain(GROUND_UNIT_LINE_ID)
  })

  it('servis kutusunu silmez — kaynak yerinde kalır', () => {
    requestRiserDeletion()

    expect(pending()?.elementIds).not.toContain(SERVICE_BOX_ID)
  })

  it('onaya silinecek hat uzunluğunu taşır', () => {
    requestRiserDeletion()

    // 400 + 200 = 600 cm
    expect(pending()?.summary?.totalLengthCm).toBeCloseTo(600)
  })

  it('silinecek gövde yoksa onay istemez', () => {
    useCadStore.setState({ installationLines: [], installationConnections: [] })

    requestRiserDeletion()

    expect(pending()).toBeNull()
  })
})

describe('requestUnitInstallationsDeletion', () => {
  it('yalnız AKTİF kattaki dairelerin içini toplar', () => {
    requestUnitInstallationsDeletion(DEFAULT_FLOOR_ID)

    expect(pending()?.kind).toBe('unitInstallations')
    expect(pending()?.lineIds).toEqual([GROUND_UNIT_LINE_ID])
    expect(pending()?.elementIds).toEqual([GROUND_STOVE_ID])
  })

  it('sayaçları ve gövdeyi korur', () => {
    requestUnitInstallationsDeletion(DEFAULT_FLOOR_ID)

    expect(pending()?.elementIds).not.toContain(GROUND_METER_ID)
    expect(pending()?.lineIds).not.toContain(TRUNK_LINE_ID)
  })

  it('dökümü bağımsız bölüm bazında verir', () => {
    requestUnitInstallationsDeletion(UPPER_FLOOR_ID)

    expect(pending()?.summary?.unitBreakdown).toEqual([
      { label: 'Bağımsız bölüm', elementCount: 1, lineCount: 1 },
    ])
  })

  it('birim numarası varsa etikette onu kullanır', () => {
    const elements = useCadStore.getState().installationElements.map((element) =>
      element.id === GROUND_METER_ID
        ? {
            ...element,
            gasMeter: {
              classLabel: '',
              inletConsumptionPoint: '',
              outletConsumptionPoint: '',
              isIndoor: true,
              isAccessible247: true,
              hasCorrector: false,
              unitNumber: '101',
            },
          }
        : element,
    )
    useCadStore.setState({ installationElements: elements })

    requestUnitInstallationsDeletion(DEFAULT_FLOOR_ID)

    expect(pending()?.summary?.unitBreakdown?.[0].label).toBe('Birim 101')
  })

  it('katta silinecek daire içi yoksa onay istemez', () => {
    requestUnitInstallationsDeletion(UPPER_FLOOR_ID)
    usePlumbingUiStore.getState().cancelCascadeDeletion()

    useCadStore.setState({ installationConnections: [] })
    requestUnitInstallationsDeletion(DEFAULT_FLOOR_ID)

    expect(pending()).toBeNull()
  })
})

/**
 * Maddeler görünüme göre KAPANMAZ; tıklanınca kullanıcıyı kendi sahnesine
 * götürür (K149). Geri alma güvenliği böyle korunuyor: işlem çalıştığında aktif
 * görünüm zaten doğru oluyor (K123/K148).
 */
describe('görünüm geçişi', () => {
  it('mimarideyken silme maddesi AÇIK ve tıklanınca tesisata geçer', async () => {
    const { useToolsMenuActions } = await import('../../../ui/menu/useToolsMenuActions')
    const { useUiStore } = await import('../../../store/uiStore')
    const { renderHook } = await import('@testing-library/react')

    useUiStore.getState().setActiveView('architecture')
    const { result } = renderHook(() => useToolsMenuActions(false))

    expect(result.current.unavailableItemIds).not.toContain('deleteRiserLine')

    result.current.run('deleteRiserLine')

    expect(useUiStore.getState().activeViewId).toBe('installation')
    expect(pending()?.kind).toBe('riserNetwork')
  })

  it('tesisattayken mahal tanımlama tıklanınca mimariye geçer', async () => {
    const { useToolsMenuActions } = await import('../../../ui/menu/useToolsMenuActions')
    const { useUiStore } = await import('../../../store/uiStore')
    const { renderHook } = await import('@testing-library/react')

    useUiStore.getState().setActiveView('installation')
    const { result } = renderHook(() => useToolsMenuActions(false))

    result.current.run('defineRooms')

    expect(useUiStore.getState().activeViewId).toBe('architecture')
  })
})
