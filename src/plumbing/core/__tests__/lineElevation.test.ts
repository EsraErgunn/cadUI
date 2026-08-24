import { describe, expect, it } from 'vitest'

import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../installationModel'
import {
  capElevationToFloor,
  findMergeablePipeLineId,
  capElevationToFloorBase,
  getAttachedLineElevationCm,
  getDischargeSourceElevationCm,
  getElementElevationCm,
  getLinePointElevationCm,
  hasPipeElevation,
  SERVICE_BOX_SEED_HEIGHT_CM,
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

describe('capElevationToFloorBase', () => {
  it('tabanın üstündeki hedefi olduğu gibi döner, taşma yoktur', () => {
    expect(capElevationToFloorBase(150)).toEqual({ endHeightCm: 150, underflowCm: 0 })
  })

  it('tam tabanda taşma yoktur', () => {
    expect(capElevationToFloorBase(0)).toEqual({ endHeightCm: 0, underflowCm: 0 })
  })

  it('tabanın altına inen hedef tabanla sınırlanır, fark taşma olur', () => {
    expect(capElevationToFloorBase(-150)).toEqual({ endHeightCm: 0, underflowCm: 150 })
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

describe('getElementElevationCm — servis kutusu varsayılan kotu', () => {
  const boxId = 950
  const box: InstallationElement = {
    id: boxId,
    floorId: 10,
    type: 'serviceBox',
    position: { x: 0, y: 0 },
    angleDeg: 0,
    scale: 1,
  }

  it('borusu henüz çizilmemiş kutu kendi çıkış kotunda (15) durur', () => {
    expect(getElementElevationCm(boxId, [], [], [box])).toBe(SERVICE_BOX_SEED_HEIGHT_CM)
  })

  it('boru çizilince kot BORUDAN gelir, varsayılan geçersizdir', () => {
    const outlet = makeHostPipe()
    outlet.pipe = { startHeightCm: 40, endHeightCm: 40, description: '' }
    const connections: InstallationConnection[] = [
      { lineId: outlet.id, end: 'start', target: { kind: 'port', elementId: boxId, portId: 'out' } },
    ]

    expect(getElementElevationCm(boxId, [outlet], connections, [box])).toBe(40)
  })

  it('bağsız DİĞER türler 0 kotunda kalır — varsayılan yalnız servis kutusuna ait', () => {
    const meter: InstallationElement = { ...box, id: 951, type: 'gasMeter' }

    expect(getElementElevationCm(951, [], [], [meter])).toBe(0)
  })
})

describe('hasPipeElevation', () => {
  it('kotu olan boru için true döner', () => {
    expect(hasPipeElevation(makeHostPipe())).toBe(true)
  })

  it('tek ucu yükselmiş boru (kolon) da kot taşır', () => {
    const line = makeHostPipe()
    line.pipe = { startHeightCm: 0, endHeightCm: 275, description: '' }
    expect(hasPipeElevation(line)).toBe(true)
  })

  it('iki ucu da sıfır olan boru kotsuz sayılır', () => {
    const line = makeHostPipe()
    line.pipe = { startHeightCm: 0, endHeightCm: 0, description: '' }
    expect(hasPipeElevation(line)).toBe(false)
  })

  it('kot alanı hiç olmayan boru kotsuzdur', () => {
    const line = makeHostPipe()
    line.pipe = undefined
    expect(hasPipeElevation(line)).toBe(false)
  })

  it('iki uçlu kot taşımayan tür (cihaz kolu) her zaman kotsuzdur', () => {
    expect(hasPipeElevation(makeApplianceStub())).toBe(false)
  })
})

/** Cihazın deşarj ağzından çıkan havalandırma kanalı. Kendi kot alanı YOK. */
function makeVentilationDuct(): InstallationLine {
  return {
    id: 30,
    floorId: 1,
    kind: 'ventilationDuct',
    pipeTypeName: 'DN15',
    points: [
      { id: 301, position: { x: 400, y: 260 } },
      { id: 302, position: { x: 400, y: 600 } },
    ],
    segments: [{ id: 303, fromPointId: 301, toPointId: 302 }],
  }
}

describe('getDischargeSourceElevationCm', () => {
  it('kanal, çıktığı CİHAZIN kotunu alır', () => {
    const lines = [makeHostPipe(), makeApplianceStub(), makeVentilationDuct()]
    const connections: InstallationConnection[] = [
      ...makeStubConnections(),
      {
        lineId: 30,
        end: 'start',
        target: {
          kind: 'outlet',
          elementId: APPLIANCE_ID,
          position: [0, 0],
          direction: [0, 1],
        },
      },
    ]

    expect(getDischargeSourceElevationCm(makeVentilationDuct(), lines, connections)).toBeCloseTo(
      HOST_ELEVATION_CM,
      9,
    )
  })

  it('hiçbir cihaza bağlı olmayan kanalda 0 döner', () => {
    expect(getDischargeSourceElevationCm(makeVentilationDuct(), [], [])).toBe(0)
  })
})

describe('findMergeablePipeLineId', () => {
  const ANCHOR = { x: 100, y: 100 }
  const riser: InstallationLine = {
    id: 70,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: 700, position: ANCHOR },
      { id: 701, position: ANCHOR },
    ],
    segments: [{ id: 7000, fromPointId: 700, toPointId: 701 }],
    pipe: { startHeightCm: 0, endHeightCm: 200, description: '' },
  }
  const startTarget = { kind: 'linePoint', lineId: 70, pointId: 701 } as const

  it('aynı konumdaki dikey borunun ucunda birleşir', () => {
    expect(findMergeablePipeLineId(ANCHOR, startTarget, [riser])).toBe(70)
  })

  it('uçta ARMATÜR varsa birleşmez — kot vanadan DEVAM etmeli', () => {
    const withValve: InstallationLine = {
      ...riser,
      points: [riser.points[0], { ...riser.points[1], inlineElementId: 900 }],
    }

    expect(findMergeablePipeLineId(ANCHOR, startTarget, [withValve])).toBeNull()
  })

  it('yatay boruda birleşme yok', () => {
    const horizontal: InstallationLine = {
      ...riser,
      points: [riser.points[0], { id: 701, position: { x: 300, y: 100 } }],
    }

    expect(findMergeablePipeLineId(ANCHOR, startTarget, [horizontal])).toBeNull()
  })
})
