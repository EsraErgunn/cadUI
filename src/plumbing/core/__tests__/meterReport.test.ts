import { describe, expect, it } from 'vitest'

import type { Id } from '../../../core/model'
import type { GasMeterProperties } from '../elementProperties'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../installationModel'
import { buildMeterReport } from '../meterReport'

const POSITION = { x: 0, y: 0 }

function makeMeter(id: Id, overrides: Partial<GasMeterProperties> = {}): InstallationElement {
  return {
    id,
    floorId: 1,
    type: 'gasMeter',
    position: POSITION,
    angleDeg: 0,
    scale: 1,
    gasMeter: {
      classLabel: 'G4',
      inletConsumptionPoint: '',
      outletConsumptionPoint: '',
      isIndoor: false,
      isAccessible247: false,
      hasCorrector: false,
      meterOrder: 1,
      unitNumber: 'D20',
      subscriberName: 'FATMA ÇELİK',
      subscriberNo: '10208728',
      flowCubicMeterPerHour: 3.5,
      pressureMbar: 21,
      areaSquareMeters: 64,
      ...overrides,
    },
  }
}

function makeValve(id: Id): InstallationElement {
  return {
    id,
    floorId: 1,
    type: 'valve',
    position: POSITION,
    angleDeg: 0,
    scale: 1,
    valve: { type: '', description: '' },
  }
}

function makeCombiBoiler(id: Id, brand: string, model: string): InstallationElement {
  return {
    id,
    floorId: 1,
    type: 'combiBoiler',
    position: POSITION,
    angleDeg: 0,
    scale: 1,
    combiBoiler: {
      applianceType: 'hermetic',
      brand,
      model,
      description: '',
      capacity: '20640',
      power: '',
      flowCubicMeterPerHour: 2.5,
    },
  }
}

function makeStove(id: Id): InstallationElement {
  return {
    id,
    floorId: 1,
    type: 'stove',
    position: POSITION,
    angleDeg: 0,
    scale: 1,
    stove: {
      brand: '',
      model: '',
      description: '',
      capacity: '13200',
      power: '',
      flowCubicMeterPerHour: 1.6,
    },
  }
}

function makeLine(
  id: Id,
  pointIds: readonly Id[],
  pipeTypeName: InstallationLine['pipeTypeName'],
  inlineElementIdByPointId: Readonly<Record<Id, Id>> = {},
): InstallationLine {
  const points = pointIds.map((pointId) => ({
    id: pointId,
    position: POSITION,
    inlineElementId: inlineElementIdByPointId[pointId],
  }))
  const segments = pointIds.slice(1).map((pointId, index) => ({
    id: id * 1000 + index,
    fromPointId: pointIds[index],
    toPointId: pointId,
  }))
  return { id, floorId: 1, kind: 'pipe', pipeTypeName, points, segments }
}

function portConnection(
  lineId: Id,
  end: InstallationConnection['end'],
  elementId: Id,
  portId: string,
): InstallationConnection {
  return { lineId, end, target: { kind: 'port', elementId, portId } }
}

function lineConnection(
  lineId: Id,
  end: InstallationConnection['end'],
  targetLineId: Id,
  targetPointId: Id,
): InstallationConnection {
  return { lineId, end, target: { kind: 'line', lineId: targetLineId, pointId: targetPointId } }
}

describe('buildMeterReport', () => {
  it('sayaç → inline vana → boru → kombi zincirini tek satırda toplar', () => {
    const meter = makeMeter(1)
    const valve = makeValve(2)
    const combi = makeCombiBoiler(3, 'BOSCH', 'Condens 1200 W')
    const line = makeLine(10, [100, 101, 102], 'DN25', { 101: 2 })

    const report = buildMeterReport({
      installationElements: [meter, valve, combi],
      installationLines: [line],
      installationConnections: [
        portConnection(10, 'start', 1, 'out'),
        portConnection(10, 'end', 3, 'in'),
      ],
    })

    expect(report).toHaveLength(1)
    const [row] = report
    expect(row.meterElementId).toBe(1)
    expect(row.unitNumber).toBe('D20')
    expect(row.pipeTypeName).toBe('DN25')
    expect(row.fittingElementIds).toEqual([2])
    expect(row.devices).toHaveLength(1)
    expect(row.devices[0]).toMatchObject({
      elementId: 3,
      brand: 'BOSCH',
      model: 'Condens 1200 W',
      flowCubicMeterPerHour: 2.5,
      flueLabel: 'Hermetik',
    })
  })

  it('komşu dairenin sayacına GEÇMEZ — her sayaç kendi alt ağacında kalır', () => {
    const meter1 = makeMeter(1, { meterOrder: 1, unitNumber: 'D20' })
    const meter2 = makeMeter(2, { meterOrder: 2, unitNumber: 'D21' })
    const combi = makeCombiBoiler(4, 'VAILLANT', 'ecoTEC plus')

    // Ana hat meter1'in çıkışından meter2'nin girişine uğruyor (sınır senaryosu);
    // meter2'nin KENDİ çıkışından ayrı bir hatla kombiye bağlı.
    const mainLine = makeLine(10, [100, 101], 'DN20')
    const meter2OutLine = makeLine(11, [110, 111], 'DN25')

    const report = buildMeterReport({
      installationElements: [meter1, meter2, combi],
      installationLines: [mainLine, meter2OutLine],
      installationConnections: [
        portConnection(10, 'start', 1, 'out'),
        portConnection(10, 'end', 2, 'in'),
        portConnection(11, 'start', 2, 'out'),
        portConnection(11, 'end', 4, 'in'),
      ],
    })

    expect(report).toHaveLength(2)
    const [row1, row2] = report
    expect(row1.meterElementId).toBe(1)
    expect(row1.pipeTypeName).toBe('DN20')
    expect(row1.devices).toEqual([])

    expect(row2.meterElementId).toBe(2)
    expect(row2.pipeTypeName).toBe('DN25')
    expect(row2.devices).toHaveLength(1)
    expect(row2.devices[0].elementId).toBe(4)
  })

  it('cihaza bağlanmamış hat için boş cihaz dizisi döner', () => {
    const meter = makeMeter(1)
    const line = makeLine(10, [100, 101], 'DN25')

    const report = buildMeterReport({
      installationElements: [meter],
      installationLines: [line],
      installationConnections: [portConnection(10, 'start', 1, 'out')],
    })

    expect(report).toHaveLength(1)
    expect(report[0].pipeTypeName).toBe('DN25')
    expect(report[0].devices).toEqual([])
    expect(report[0].fittingElementIds).toEqual([])
  })

  it('branşman köşesinden ayrılan iki hattaki cihazları da toplar', () => {
    const meter = makeMeter(1)
    const combi = makeCombiBoiler(5, 'BOSCH', 'Condens')
    const stove = makeStove(6)

    const trunk = makeLine(10, [200, 201], 'DN25')
    const toCombi = makeLine(11, [210, 211], 'DN20')
    const toStove = makeLine(12, [220, 221], 'DN20')

    const report = buildMeterReport({
      installationElements: [meter, combi, stove],
      installationLines: [trunk, toCombi, toStove],
      installationConnections: [
        portConnection(10, 'start', 1, 'out'),
        lineConnection(11, 'start', 10, 201),
        portConnection(11, 'end', 5, 'in'),
        lineConnection(12, 'start', 10, 201),
        portConnection(12, 'end', 6, 'in'),
      ],
    })

    expect(report).toHaveLength(1)
    const deviceIds = report[0].devices.map((device) => device.elementId).sort()
    expect(deviceIds).toEqual([5, 6])
  })

  it('sayaç ile cihaz arasındaki GEÇİŞ elemanından (solenoid vana) atlamadan devam eder', () => {
    // docs/sample-project.json'daki gerçek örüntü: sayaç doğrudan cihaza değil,
    // ayrı bir eleman olarak modellenmiş solenoid vanaya bağlı; asıl cihazlar
    // vananın ÇIKIŞINDAN, ortak bir branşman köşesinden dallanıyor.
    const meter = makeMeter(1)
    const solenoid: InstallationElement = {
      id: 2,
      floorId: 1,
      type: 'solenoidValve',
      position: POSITION,
      angleDeg: 0,
      scale: 1,
      solenoidValve: { type: 'Gaz Alarm Cihazı İrtibatlı', brand: 'Kiwa', model: 'SV-20' },
    }
    const stove = makeStove(3)
    const combi = makeCombiBoiler(4, 'Vaillant', 'CB-24')

    const meterToSolenoid = makeLine(10, [100, 101], 'DN25')
    const solenoidToBranch = makeLine(11, [110, 111], 'DN20')
    const branchToStove = makeLine(12, [120, 121], 'DN20')
    const branchToCombi = makeLine(13, [130, 131], 'DN20')

    const report = buildMeterReport({
      installationElements: [meter, solenoid, stove, combi],
      installationLines: [meterToSolenoid, solenoidToBranch, branchToStove, branchToCombi],
      installationConnections: [
        portConnection(10, 'start', 1, 'out'),
        portConnection(10, 'end', 2, 'in'),
        portConnection(11, 'start', 2, 'out'),
        lineConnection(12, 'start', 11, 111),
        portConnection(12, 'end', 3, 'in'),
        lineConnection(13, 'start', 11, 111),
        portConnection(13, 'end', 4, 'in'),
      ],
    })

    expect(report).toHaveLength(1)
    expect(report[0].fittingElementIds).toEqual([2])
    const deviceIds = report[0].devices.map((device) => device.elementId).sort()
    expect(deviceIds).toEqual([3, 4])
  })

  it('bir nokta hem elemanın portuna hem branşman köşesine AYNI ANDA bağlıyken hiçbir dalı atlamaz', () => {
    // Gerçek çıktıda görülen örüntü: solenoid vananın ÇIKIŞ portu, altı cihaza
    // birden dallanan ortak köşenin TAM ÜSTÜNE düşüyor. O köşe hem "bu hattın
    // ucu bir elemanın portuna bağlı" hem "bu köşeye başka hatlar da tutunmuş"
    // — biri diğerini elemeden ikisi de işlenmeli.
    const meter = makeMeter(1)
    const solenoid: InstallationElement = {
      id: 2,
      floorId: 1,
      type: 'solenoidValve',
      position: POSITION,
      angleDeg: 0,
      scale: 1,
      solenoidValve: { type: '', brand: '', model: '' },
    }
    const stove = makeStove(3)
    const combiA = makeCombiBoiler(4, 'A', 'A')
    const combiB = makeCombiBoiler(5, 'B', 'B')

    const meterToSolenoid = makeLine(10, [100, 101], 'DN25')
    // solenoid'in ÇIKIŞI bu hattın BAŞLANGICINA bağlı (110) — üç dal da AYNI
    // noktadan (110) ayrılıyor: kendisi Ocak'a gidiyor, iki kardeş hat da
    // oradan başlıyor.
    const solenoidToStove = makeLine(11, [110, 111], 'DN20')
    const branchToCombiA = makeLine(12, [120, 121], 'DN20')
    const branchToCombiB = makeLine(13, [130, 131], 'DN20')

    const report = buildMeterReport({
      installationElements: [meter, solenoid, stove, combiA, combiB],
      installationLines: [meterToSolenoid, solenoidToStove, branchToCombiA, branchToCombiB],
      installationConnections: [
        portConnection(10, 'start', 1, 'out'),
        portConnection(10, 'end', 2, 'in'),
        portConnection(11, 'start', 2, 'out'),
        portConnection(11, 'end', 3, 'in'),
        lineConnection(12, 'start', 11, 110),
        portConnection(12, 'end', 4, 'in'),
        lineConnection(13, 'start', 11, 110),
        portConnection(13, 'end', 5, 'in'),
      ],
    })

    expect(report).toHaveLength(1)
    expect(report[0].fittingElementIds).toEqual([2])
    const deviceIds = report[0].devices.map((device) => device.elementId).sort()
    expect(deviceIds).toEqual([3, 4, 5])
  })

  it('meterOrder alanına göre artan sırada döner', () => {
    const meters = [
      makeMeter(1, { meterOrder: 3 }),
      makeMeter(2, { meterOrder: 1 }),
      makeMeter(3, { meterOrder: 2 }),
    ]

    const report = buildMeterReport({
      installationElements: meters,
      installationLines: [],
      installationConnections: [],
    })

    expect(report.map((row) => row.meterElementId)).toEqual([2, 3, 1])
    expect(report.map((row) => row.meterOrder)).toEqual([1, 2, 3])
  })

  it('meterOrder/abone alanları hiç yoksa (eski kayıt) varsayılanlarla döner', () => {
    const meter: InstallationElement = {
      id: 1,
      floorId: 1,
      type: 'gasMeter',
      position: POSITION,
      angleDeg: 0,
      scale: 1,
      gasMeter: {
        classLabel: 'G4',
        inletConsumptionPoint: '',
        outletConsumptionPoint: '',
        isIndoor: false,
        isAccessible247: false,
        hasCorrector: false,
        // meterOrder/unitNumber/... BİLEREK yok — eski kayıt senaryosu.
      },
    }

    const report = buildMeterReport({
      installationElements: [meter],
      installationLines: [],
      installationConnections: [],
    })

    expect(report).toEqual([
      {
        meterElementId: 1,
        meterOrder: 0,
        unitNumber: '',
        subscriberName: '',
        subscriberNo: '',
        classLabel: 'G4',
        flowCubicMeterPerHour: 0,
        pressureMbar: 0,
        areaSquareMeters: 0,
        pipeTypeName: null,
        fittingElementIds: [],
        devices: [],
      },
    ])
  })
})
