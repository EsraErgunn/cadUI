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
