import { describe, expect, it } from 'vitest'

import type { InstallationConnection, InstallationLine } from '../installationModel'
import { resolveMoveTargets } from '../moveTargets'

const VALVE_ID = 10
const METER_ID = 11
const GROUND_POINT_ID = 1
const VALVE_POINT_ID = 2
const METER_POINT_ID = 3
const HOST_START_ID = 50
const HOST_END_ID = 51
const APPLIANCE_ID = 20
const MAIN_START_ID = 60
const MAIN_END_ID = 61
const STUB_ROOT_ID = 70
const STUB_TIP_ID = 71

/** Branşman kolu: yer → vananın oturduğu köşe → sayacın bağlandığı uç. */
const branchStub: InstallationLine = {
  id: 100,
  floorId: 1,
  kind: 'branchStub',
  pipeTypeName: 'DN20',
  points: [
    { id: GROUND_POINT_ID, position: { x: 0, y: 0 } },
    { id: VALVE_POINT_ID, position: { x: 90, y: 0 }, inlineElementId: VALVE_ID },
    { id: METER_POINT_ID, position: { x: 100, y: 0 } },
  ],
  segments: [
    { id: 200, fromPointId: GROUND_POINT_ID, toPointId: VALVE_POINT_ID },
    { id: 201, fromPointId: VALVE_POINT_ID, toPointId: METER_POINT_ID },
  ],
}

const meterConnection: InstallationConnection = {
  lineId: branchStub.id,
  end: 'end',
  target: { kind: 'port', elementId: METER_ID, portId: 'input' },
}

describe('resolveMoveTargets — branşman vanası', () => {
  it('yalnız sayaç seçiliyken taşınınca, aradaki vana da (kendi köşesiyle) sürüklemeye katılır', () => {
    const targets = resolveMoveTargets([branchStub], [meterConnection], [METER_ID], [])

    expect(targets.elementIds.has(METER_ID)).toBe(true)
    expect(targets.elementIds.has(VALVE_ID)).toBe(true)
    expect(targets.pointIds.has(METER_POINT_ID)).toBe(true)
    expect(targets.pointIds.has(VALVE_POINT_ID)).toBe(true)
    // Yer noktası (branşmanın çapası) esnemeye devam eder — kaymaz.
    expect(targets.pointIds.has(GROUND_POINT_ID)).toBe(false)
  })
})

describe('resolveMoveTargets — branşmanın ana hatta tutunması', () => {
  const hostLine: InstallationLine = {
    id: 200,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN20',
    points: [
      { id: HOST_START_ID, position: { x: 0, y: 0 } },
      { id: HOST_END_ID, position: { x: 200, y: 0 } },
    ],
    segments: [{ id: 300, fromPointId: HOST_START_ID, toPointId: HOST_END_ID }],
  }
  // Branşmanın YER ucu ana hattın bir noktasına tutunuyor.
  const groundAttachment: InstallationConnection = {
    lineId: branchStub.id,
    end: 'start',
    target: { kind: 'line', lineId: hostLine.id, pointId: HOST_END_ID },
  }

  it('branşman taşınınca ana borunun bağlantı KÖŞESİ takip eder, öbür ucu yerinde kalır (boru bükülür)', () => {
    const targets = resolveMoveTargets(
      [branchStub, hostLine],
      [groundAttachment],
      [],
      [branchStub.id],
    )

    expect(targets.pointIds.has(GROUND_POINT_ID)).toBe(true)
    // Bağlantı köşesi branşmanla birlikte gelir — yoksa bağ görsel olarak kopar.
    expect(targets.pointIds.has(HOST_END_ID)).toBe(true)
    // Borunun ÖBÜR ucu yerinde kalır: boru o köşeden BÜKÜLÜR, komple kaymaz.
    expect(targets.pointIds.has(HOST_START_ID)).toBe(false)
  })

  it('ana boru taşınınca branşmanın yer ucu onu TAKİP EDER', () => {
    const targets = resolveMoveTargets([branchStub, hostLine], [groundAttachment], [], [hostLine.id])

    expect(targets.pointIds.has(HOST_END_ID)).toBe(true)
    expect(targets.pointIds.has(GROUND_POINT_ID)).toBe(true)
  })
})

describe('resolveMoveTargets — cihaz kolu yalnız bağlantı yerinden gerilir', () => {
  /** Ana boru; ucundaki düğümde `nearestLine`'ın otomatik vanası oturuyor. */
  const mainLine: InstallationLine = {
    id: 300,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN20',
    points: [
      { id: MAIN_START_ID, position: { x: 0, y: 0 } },
      { id: MAIN_END_ID, position: { x: 200, y: 0 }, inlineElementId: VALVE_ID },
    ],
    segments: [{ id: 400, fromPointId: MAIN_START_ID, toPointId: MAIN_END_ID }],
  }
  /** Cihaz kolu TAM İKİ noktalı: kökü ana borunun düğümünde, ucu cihazın portunda. */
  const applianceStub: InstallationLine = {
    id: 301,
    floorId: 1,
    kind: 'applianceStub',
    pipeTypeName: 'DN20',
    points: [
      { id: STUB_ROOT_ID, position: { x: 200, y: 0 } },
      { id: STUB_TIP_ID, position: { x: 200, y: 80 } },
    ],
    segments: [{ id: 401, fromPointId: STUB_ROOT_ID, toPointId: STUB_TIP_ID }],
  }
  const stubConnections: InstallationConnection[] = [
    { lineId: applianceStub.id, end: 'start', target: { kind: 'line', lineId: mainLine.id, pointId: MAIN_END_ID } },
    { lineId: applianceStub.id, end: 'end', target: { kind: 'port', elementId: APPLIANCE_ID, portId: 'input' } },
  ]

  it('cihaz taşınınca yalnız kolun cihaz UCU kayar; kök, ana boru ve vanası yerinde kalır', () => {
    const targets = resolveMoveTargets(
      [mainLine, applianceStub],
      stubConnections,
      [APPLIANCE_ID],
      [],
    )

    expect(targets.pointIds.has(STUB_TIP_ID)).toBe(true)
    // Kolun kökü kalır → kol GERİLİR, ana boru peşinden sürüklenmez.
    expect(targets.pointIds.has(STUB_ROOT_ID)).toBe(false)
    expect(targets.pointIds.has(MAIN_END_ID)).toBe(false)
    expect(targets.pointIds.has(MAIN_START_ID)).toBe(false)
    expect(targets.elementIds.has(VALVE_ID)).toBe(false)
  })
})
