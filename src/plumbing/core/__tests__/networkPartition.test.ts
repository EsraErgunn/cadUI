import { describe, expect, it } from 'vitest'

import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../installationModel'
import {
  getTotalLineLengthCm,
  isUnitBoundaryElement,
  partitionInstallation,
} from '../networkPartition'
import type { InstallationElementType } from '../symbolMetadata'

const SERVICE_BOX_ID = 1
const METER_ID = 2
const STOVE_ID = 3

function makeElement(id: number, type: InstallationElementType): InstallationElement {
  return { id, floorId: 1, type, position: { x: 0, y: 0 }, angleDeg: 0, scale: 1 }
}

/** Yatay, `lengthCm` boyunda tek segmentlik boru. */
function makeLine(id: number, lengthCm: number): InstallationLine {
  return {
    id,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: id * 100, position: { x: 0, y: 0 } },
      { id: id * 100 + 1, position: { x: lengthCm, y: 0 } },
    ],
    segments: [{ id: id * 1000, fromPointId: id * 100, toPointId: id * 100 + 1 }],
  }
}

/** Servis kutusu → (kolon/branşman) → sayaç → (daire içi) → ocak. */
const ELEMENTS = [
  makeElement(SERVICE_BOX_ID, 'serviceBox'),
  makeElement(METER_ID, 'gasMeter'),
  makeElement(STOVE_ID, 'stove'),
]

const TRUNK_LINE = makeLine(10, 300)
const UNIT_LINE = makeLine(20, 150)
const LINES = [TRUNK_LINE, UNIT_LINE]

const CONNECTIONS: InstallationConnection[] = [
  { lineId: 10, end: 'start', target: { kind: 'port', elementId: SERVICE_BOX_ID, portId: 'out' } },
  { lineId: 10, end: 'end', target: { kind: 'port', elementId: METER_ID, portId: 'in' } },
  { lineId: 20, end: 'start', target: { kind: 'port', elementId: METER_ID, portId: 'out' } },
  { lineId: 20, end: 'end', target: { kind: 'port', elementId: STOVE_ID, portId: 'in' } },
]

const SOURCE = {
  installationElements: ELEMENTS,
  installationLines: LINES,
  installationConnections: CONNECTIONS,
  floorPipeLinks: [],
}

describe('isUnitBoundaryElement', () => {
  it('sınır SAYAÇ — tüketim vanası modelde yok', () => {
    expect(isUnitBoundaryElement(makeElement(9, 'gasMeter'))).toBe(true)
    expect(isUnitBoundaryElement(makeElement(9, 'valve'))).toBe(false)
    expect(isUnitBoundaryElement(makeElement(9, 'serviceBox'))).toBe(false)
  })
})

describe('partitionInstallation', () => {
  it('gövde sayaca KADAR olan hattı alır, bölüm içini almaz', () => {
    const partition = partitionInstallation(SOURCE)

    expect(partition.trunk.lineIds).toEqual([TRUNK_LINE.id])
    expect(partition.trunk.elementIds).toEqual([])
  })

  it('sayaç GÖVDEYE de bölüm içine de girmez — sınır korunur', () => {
    const partition = partitionInstallation(SOURCE)

    expect(partition.boundaryElementIds).toEqual([METER_ID])
    expect(partition.trunk.elementIds).not.toContain(METER_ID)
    expect(partition.units[0].elementIds).not.toContain(METER_ID)
  })

  it('bölüm içi sayacın ÇIKIŞINDAN sonrasıdır', () => {
    const [unit] = partitionInstallation(SOURCE).units

    expect(unit.boundaryElementId).toBe(METER_ID)
    expect(unit.lineIds).toEqual([UNIT_LINE.id])
    expect(unit.elementIds).toEqual([STOVE_ID])
  })

  it('servis kutusu gövdeye GİRMEZ — kaynak silinmemeli', () => {
    expect(partitionInstallation(SOURCE).trunk.elementIds).not.toContain(SERVICE_BOX_ID)
  })

  it('üç küme birbirini dışlar', () => {
    const partition = partitionInstallation(SOURCE)
    const unitElementIds = partition.units.flatMap((unit) => unit.elementIds)

    for (const id of partition.trunk.elementIds) {
      expect(unitElementIds).not.toContain(id)
      expect(partition.boundaryElementIds).not.toContain(id)
    }
  })

  it('servis kutusu yoksa gövde boş kalır ama bölümler yine bulunur', () => {
    const partition = partitionInstallation({
      ...SOURCE,
      installationElements: ELEMENTS.filter((element) => element.type !== 'serviceBox'),
    })

    expect(partition.trunk).toEqual({ elementIds: [], lineIds: [] })
    expect(partition.units[0].lineIds).toEqual([UNIT_LINE.id])
  })

  it('çıkışı bağlı olmayan sayaç boş bir bölüm verir', () => {
    const partition = partitionInstallation({
      ...SOURCE,
      installationConnections: CONNECTIONS.filter((connection) => connection.lineId !== 20),
    })

    expect(partition.units[0].elementIds).toEqual([])
    expect(partition.units[0].lineIds).toEqual([])
  })
})

describe('getTotalLineLengthCm', () => {
  it('yalnız istenen hatların boyunu toplar', () => {
    expect(getTotalLineLengthCm(LINES, [TRUNK_LINE.id])).toBeCloseTo(300)
    expect(getTotalLineLengthCm(LINES, [TRUNK_LINE.id, UNIT_LINE.id])).toBeCloseTo(450)
    expect(getTotalLineLengthCm(LINES, [])).toBe(0)
  })
})
