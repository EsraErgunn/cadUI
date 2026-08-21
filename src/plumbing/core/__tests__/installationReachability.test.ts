import { describe, expect, it } from 'vitest'

import type { InstallationConnection, InstallationLine } from '../installationModel'
import { collectAdjacentInstallation } from '../installationReachability'

function makeLine(id: number, inlineElementId?: number): InstallationLine {
  return {
    id,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: id * 100, position: { x: 0, y: 0 } },
      { id: id * 100 + 1, position: { x: 100, y: 0 }, inlineElementId },
    ],
    segments: [{ id: id * 1000, fromPointId: id * 100, toPointId: id * 100 + 1 }],
  }
}

const LINE_A = makeLine(1)
const LINE_B = makeLine(2, 91)
const LINES = [LINE_A, LINE_B]

const CONNECTIONS: InstallationConnection[] = [
  { lineId: 1, end: 'start', target: { kind: 'port', elementId: 90, portId: 'out' } },
  { lineId: 2, end: 'start', target: { kind: 'line', lineId: 1, pointId: 101 } },
]

describe('collectAdjacentInstallation', () => {
  it('silinen hattın porttan bağlı elemanını ve komşu hattını verir', () => {
    expect(collectAdjacentInstallation(LINES, CONNECTIONS, [], [1])).toEqual({
      elementIds: [90],
      lineIds: [2],
    })
  })

  it('boruya oturan armatürü komşu sayar', () => {
    expect(collectAdjacentInstallation(LINES, CONNECTIONS, [], [2])).toEqual({
      elementIds: [91],
      lineIds: [1],
    })
  })

  it('cihazla birlikte giden kolun ÖTESİNDEKİ ana hattı komşu verir', () => {
    // Cihaz (90) + kolu (1) birlikte siliniyor; zincir kolun bağlandığı ana
    // hatta (2) devam etmeli, yoksa cihaz silmede ardışık silme dururdu.
    expect(collectAdjacentInstallation(LINES, CONNECTIONS, [90], [1])).toEqual({
      elementIds: [],
      lineIds: [2],
    })
  })

  it('silinen kümenin kendi üyelerini komşu olarak döndürmez', () => {
    expect(collectAdjacentInstallation(LINES, CONNECTIONS, [90, 91], [1, 2])).toEqual({
      elementIds: [],
      lineIds: [],
    })
  })

  it('bağı olmayan seçim için boş küme verir', () => {
    expect(collectAdjacentInstallation(LINES, [], [], [1])).toEqual({
      elementIds: [],
      lineIds: [],
    })
  })
})
