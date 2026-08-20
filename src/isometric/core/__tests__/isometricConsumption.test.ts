import { describe, expect, it } from 'vitest'

import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../../plumbing/core/installationModel'
import { isConsumptionLine } from '../isometricLabels'

const LINE_ID = 20

function makeLine(kind: InstallationLine['kind'] = 'applianceStub'): InstallationLine {
  return {
    id: LINE_ID,
    floorId: 1,
    kind,
    pipeTypeName: 'DN15',
    points: [
      { id: 201, position: { x: 0, y: 0 } },
      { id: 202, position: { x: 100, y: 0 } },
    ],
    segments: [{ id: 203, fromPointId: 201, toPointId: 202 }],
  }
}

function makeElement(id: number, type: InstallationElement['type']): InstallationElement {
  return { id, floorId: 1, type, position: { x: 0, y: 0 }, angleDeg: 0, scale: 1 }
}

function portConnection(elementId: number): InstallationConnection {
  return { lineId: LINE_ID, end: 'end', target: { kind: 'port', elementId, portId: 'in' } }
}

describe('isConsumptionLine', () => {
  it('yakıcı cihaza bağlı hat tüketim hattıdır', () => {
    const appliance = makeElement(700, 'combiBoiler')
    expect(isConsumptionLine(makeLine(), [appliance], [portConnection(700)])).toBe(true)
  })

  it('her yakıcı cihaz türü sayılır', () => {
    for (const type of ['stove', 'spaceHeater', 'waterHeater', 'boiler', 'otherAppliance'] as const) {
      const appliance = makeElement(700, type)
      expect(isConsumptionLine(makeLine(), [appliance], [portConnection(700)])).toBe(true)
    }
  })

  it('sayaca/vanaya bağlı ARA hat tüketim hattı DEĞİLDİR', () => {
    // Etiketlenmemesinin sebebi bu: gövde onlarca parçaya bölünüyor ve hepsine
    // boy/çap yazılınca çizim rakam bulutuna dönüyordu.
    for (const type of ['gasMeter', 'valve', 'regulator', 'serviceBox'] as const) {
      const element = makeElement(800, type)
      expect(isConsumptionLine(makeLine('pipe'), [element], [portConnection(800)])).toBe(false)
    }
  })

  it('hiçbir elemana bağlı olmayan hat tüketim hattı değildir', () => {
    expect(isConsumptionLine(makeLine('pipe'), [], [])).toBe(false)
  })

  it('başka bir hattın bağlantısı bu hattı tüketim yapmaz', () => {
    const appliance = makeElement(700, 'combiBoiler')
    const otherLineConnection: InstallationConnection = {
      lineId: 999,
      end: 'end',
      target: { kind: 'port', elementId: 700, portId: 'in' },
    }
    expect(isConsumptionLine(makeLine(), [appliance], [otherLineConnection])).toBe(false)
  })

  it('hatta bağlanan uç (kind: line) eleman değildir, sayılmaz', () => {
    const appliance = makeElement(700, 'combiBoiler')
    const lineConnection: InstallationConnection = {
      lineId: LINE_ID,
      end: 'start',
      target: { kind: 'line', lineId: 1, pointId: 12 },
    }
    expect(isConsumptionLine(makeLine(), [appliance], [lineConnection])).toBe(false)
  })
})
