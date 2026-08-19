import { describe, expect, it } from 'vitest'

import type { InstallationConnection, InstallationElement, InstallationLine } from '../installationModel'
import { collectMeterDownstreamInstallation } from '../meterReport'

function makeElement(
  id: number,
  type: InstallationElement['type'],
): InstallationElement {
  return { id, floorId: 1, type, position: { x: 0, y: 0 }, angleDeg: 0, scale: 1 }
}

function makeLine(id: number, pointIds: number[], inlineElementId?: number): InstallationLine {
  return {
    id,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN20',
    points: pointIds.map((pointId, index) => ({
      id: pointId,
      position: { x: index * 10, y: 0 },
      ...(index === 0 && inlineElementId !== undefined ? { inlineElementId } : {}),
    })),
    segments:
      pointIds.length < 2
        ? []
        : [{ id: pointIds[0], fromPointId: pointIds[0], toPointId: pointIds[1] }],
  }
}

describe('collectMeterDownstreamInstallation', () => {
  it('sayacın çıkışındaki boru/armatür/cihaz ağını toplar, girişini (servis kutusu tarafını) toplamaz', () => {
    // serviceBox --L1-- meter --L2(vana armatürlü)-- --port-- stove
    const serviceBox = makeElement(1, 'serviceBox')
    const meter = makeElement(2, 'gasMeter')
    const valve = makeElement(3, 'valve')
    const stove = makeElement(4, 'stove')

    const inletLine = makeLine(10, [100, 101])
    const outletLine = makeLine(11, [102, 103], valve.id)

    const elements = [serviceBox, meter, valve, stove]
    const lines = [inletLine, outletLine]
    const connections: InstallationConnection[] = [
      { lineId: inletLine.id, end: 'start', target: { kind: 'port', elementId: serviceBox.id, portId: 'out' } },
      { lineId: inletLine.id, end: 'end', target: { kind: 'port', elementId: meter.id, portId: 'in' } },
      { lineId: outletLine.id, end: 'start', target: { kind: 'port', elementId: meter.id, portId: 'out' } },
      { lineId: outletLine.id, end: 'end', target: { kind: 'port', elementId: stove.id, portId: 'in' } },
    ]

    const result = collectMeterDownstreamInstallation(meter.id, elements, lines, connections)

    expect(result.lineIds.sort()).toEqual([outletLine.id])
    expect(result.elementIds.sort((a, b) => a - b)).toEqual(
      [meter.id, valve.id, stove.id].sort((a, b) => a - b),
    )
    // Servis kutusu ve girişteki boru hiç görülmedi.
    expect(result.elementIds).not.toContain(serviceBox.id)
    expect(result.lineIds).not.toContain(inletLine.id)
  })

  it('komşu dairenin sayacına geçmez — dal orada biter', () => {
    const meter = makeElement(1, 'gasMeter')
    const neighborMeter = makeElement(2, 'gasMeter')

    const outletLine = makeLine(10, [100, 101])

    const elements = [meter, neighborMeter]
    const lines = [outletLine]
    const connections: InstallationConnection[] = [
      { lineId: outletLine.id, end: 'start', target: { kind: 'port', elementId: meter.id, portId: 'out' } },
      { lineId: outletLine.id, end: 'end', target: { kind: 'port', elementId: neighborMeter.id, portId: 'in' } },
    ]

    const result = collectMeterDownstreamInstallation(meter.id, elements, lines, connections)

    expect(result.lineIds).toEqual([outletLine.id])
    expect(result.elementIds).toEqual([meter.id])
    expect(result.elementIds).not.toContain(neighborMeter.id)
  })
})
