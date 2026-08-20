import { describe, expect, it } from 'vitest'

import type {
  InstallationConnection,
  InstallationLine,
} from '../installationModel'
import {
  capElevationToFloor,
  getAttachedLineElevationCm,
  getElementElevationCm,
  getLinePointElevationCm,
} from '../lineElevation'

describe('capElevationToFloor', () => {
  it('tavanın altındaki hedefi olduğu gibi döner, taşma yoktur', () => {
    expect(capElevationToFloor(150, 300)).toEqual({ endHeightCm: 150, overflowCm: 0 })
  })

  it('tam tavanda taşma yoktur', () => {
    expect(capElevationToFloor(300, 300)).toEqual({ endHeightCm: 300, overflowCm: 0 })
  })

  it('tavanı aşan hedef tavanla sınırlanır, fark taşma olur', () => {
    expect(capElevationToFloor(450, 300)).toEqual({ endHeightCm: 300, overflowCm: 150 })
  })
})

const HOST_ELEVATION_CM = 175

function makeHostPipe(): InstallationLine {
  return {
    id: 1,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: 11, position: { x: 0, y: 0 } },
      { id: 12, position: { x: 400, y: 0 } },
    ],
    segments: [{ id: 13, fromPointId: 11, toPointId: 12 }],
    pipe: { startHeightCm: HOST_ELEVATION_CM, endHeightCm: HOST_ELEVATION_CM, description: '' },
  }
}

function makeApplianceStub(): InstallationLine {
  return {
    id: 20,
    floorId: 1,
    kind: 'applianceStub',
    pipeTypeName: 'DN15',
    points: [
      { id: 201, position: { x: 400, y: 0 } },
      { id: 202, position: { x: 400, y: 260 } },
    ],
    segments: [{ id: 203, fromPointId: 201, toPointId: 202 }],
  }
}

const APPLIANCE_ID = 700

function makeStubConnections(): InstallationConnection[] {
  return [
    { lineId: 20, end: 'start', target: { kind: 'line', lineId: 1, pointId: 12 } },
    { lineId: 20, end: 'end', target: { kind: 'port', elementId: APPLIANCE_ID, portId: 'in' } },
  ]
}

describe('getLinePointElevationCm', () => {
  it('borunun belirli köşesindeki kotu verir', () => {
    const line = makeHostPipe()
    line.pipe = { startHeightCm: 0, endHeightCm: 400, description: '' }

    expect(getLinePointElevationCm(line, 11)).toBeCloseTo(0, 9)
    expect(getLinePointElevationCm(line, 12)).toBeCloseTo(400, 9)
  })

  it('bilinmeyen köşede ve kot taşımayan hatta 0 döner', () => {
    expect(getLinePointElevationCm(makeHostPipe(), 999)).toBe(0)
    expect(getLinePointElevationCm(makeApplianceStub(), 201)).toBe(0)
  })
})

describe('getAttachedLineElevationCm', () => {
  it('kol, tutunduğu borunun O NOKTASINDAKİ kotunu alır', () => {
    const host = makeHostPipe()
    host.pipe = { startHeightCm: 0, endHeightCm: 400, description: '' }

    expect(
      getAttachedLineElevationCm(makeApplianceStub(), [host, makeApplianceStub()], makeStubConnections()),
    ).toBeCloseTo(400, 9)
  })

  it('hiçbir hatta tutunmayan kolda 0 döner', () => {
    expect(getAttachedLineElevationCm(makeApplianceStub(), [makeHostPipe()], [])).toBe(0)
  })
})

describe('getElementElevationCm — yakıcı cihaz (Adım 3)', () => {
  it('cihaz, kolunun bağlı olduğu borunun kotunu alır', () => {
    // Düzeltmeden önce burası 0 dönüyordu: `applianceStub` iki uçlu kot
    // taşımadığı için kombi/ocak/soba izometrikte yerde yatıyordu.
    const lines = [makeHostPipe(), makeApplianceStub()]

    expect(getElementElevationCm(APPLIANCE_ID, lines, makeStubConnections())).toBeCloseTo(
      HOST_ELEVATION_CM,
      9,
    )
  })

  it('kolu boruya bağlı olmayan cihaz 0 kotunda kalır', () => {
    const lines = [makeApplianceStub()]
    const connections: InstallationConnection[] = [
      { lineId: 20, end: 'end', target: { kind: 'port', elementId: APPLIANCE_ID, portId: 'in' } },
    ]

    expect(getElementElevationCm(APPLIANCE_ID, lines, connections)).toBe(0)
  })

  it('doğrudan boruya bağlı eleman (sayaç) eskisi gibi ucundaki kotu alır', () => {
    const host = makeHostPipe()
    host.pipe = { startHeightCm: 200, endHeightCm: 50, description: '' }
    const connections: InstallationConnection[] = [
      { lineId: 1, end: 'start', target: { kind: 'port', elementId: 900, portId: 'out' } },
    ]

    expect(getElementElevationCm(900, [host], connections)).toBeCloseTo(200, 9)
  })
})
