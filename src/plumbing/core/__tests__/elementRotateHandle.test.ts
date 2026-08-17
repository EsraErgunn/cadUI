import { describe, expect, it } from 'vitest'

import { getElementRotateAnchorLocal } from '../elementRotateHandle'
import type { InstallationConnection, InstallationLine } from '../installationModel'
import type { SymbolMetadata } from '../symbolMetadata'

const TWO_PORT_METADATA: SymbolMetadata = {
  id: 'gasMeter',
  label: 'Sayaç',
  asset: 'gasMeter.svg',
  viewBox: [0, 0, 100, 100],
  origin: [0, 0],
  bounds: { min: [-30, -30], max: [30, 30] },
  ports: [
    { id: 'in', type: 'input', position: [-20, 0], direction: [-1, 0] },
    { id: 'out', type: 'output', position: [20, 0], direction: [1, 0] },
  ],
}

const ONE_PORT_METADATA: SymbolMetadata = {
  ...TWO_PORT_METADATA,
  id: 'valve',
  ports: [{ id: 'in', type: 'input', position: [-10, 0], direction: [-1, 0] }],
}

function makeLine(id: number, endPointId: number): InstallationLine {
  return {
    id,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN20',
    points: [
      { id: endPointId - 1, position: { x: 0, y: 0 } },
      { id: endPointId, position: { x: 100, y: 0 } },
    ],
    segments: [{ id: 1000 + id, fromPointId: endPointId - 1, toPointId: endPointId }],
  }
}

describe('getElementRotateAnchorLocal', () => {
  it('serbest (bağlantısız) eleman için kendi kökenini pivot verir, takipçisi olmaz', () => {
    const result = getElementRotateAnchorLocal(1, ONE_PORT_METADATA, [], [])
    expect(result).toEqual({ pivotLocal: ONE_PORT_METADATA.origin, followers: [] })
  })

  it('tek porttan bağlı elemanda o port pivot olur, takipçi olmaz', () => {
    const connections: InstallationConnection[] = [
      { lineId: 1, end: 'end', target: { kind: 'port', elementId: 1, portId: 'in' } },
    ]
    const lines = [makeLine(1, 2)]

    const result = getElementRotateAnchorLocal(1, ONE_PORT_METADATA, connections, lines)

    expect(result).toEqual({ pivotLocal: ONE_PORT_METADATA.ports[0].position, followers: [] })
  })

  it('branşmandaki sayaç gibi giriş+çıkış portundan iki ayrı boruya bağlıysa döndürülebilir: biri pivot, öbürü takipçi', () => {
    const connections: InstallationConnection[] = [
      { lineId: 1, end: 'end', target: { kind: 'port', elementId: 1, portId: 'in' } },
      { lineId: 2, end: 'start', target: { kind: 'port', elementId: 1, portId: 'out' } },
    ]
    const lines = [makeLine(1, 2), makeLine(2, 4)]

    const result = getElementRotateAnchorLocal(1, TWO_PORT_METADATA, connections, lines)

    expect(result).not.toBeNull()
    expect(result?.pivotLocal).toEqual(TWO_PORT_METADATA.ports[0].position)
    expect(result?.followers).toEqual([
      { lineId: 2, pointId: 3, local: TWO_PORT_METADATA.ports[1].position },
    ])
  })

  it('birden fazla deşarj ağzına (outlet) bağlı cihaz döndürülemez', () => {
    const connections: InstallationConnection[] = [
      {
        lineId: 1,
        end: 'end',
        target: { kind: 'outlet', elementId: 1, position: [0, -10], direction: [0, -1] },
      },
      {
        lineId: 2,
        end: 'end',
        target: { kind: 'outlet', elementId: 1, position: [10, -10], direction: [0, -1] },
      },
    ]
    const lines = [makeLine(1, 2), makeLine(2, 4)]

    const result = getElementRotateAnchorLocal(1, TWO_PORT_METADATA, connections, lines)

    expect(result).toBeNull()
  })

  it('ikiden fazla tutunma noktası döndürülemez', () => {
    const threePortMetadata: SymbolMetadata = {
      ...TWO_PORT_METADATA,
      ports: [
        ...TWO_PORT_METADATA.ports,
        { id: 'aux', type: 'output', position: [0, 20], direction: [0, 1] },
      ],
    }
    const connections: InstallationConnection[] = [
      { lineId: 1, end: 'end', target: { kind: 'port', elementId: 1, portId: 'in' } },
      { lineId: 2, end: 'start', target: { kind: 'port', elementId: 1, portId: 'out' } },
      { lineId: 3, end: 'start', target: { kind: 'port', elementId: 1, portId: 'aux' } },
    ]
    const lines = [makeLine(1, 2), makeLine(2, 4), makeLine(3, 6)]

    const result = getElementRotateAnchorLocal(1, threePortMetadata, connections, lines)

    expect(result).toBeNull()
  })
})
