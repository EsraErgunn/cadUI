import { describe, expect, it } from 'vitest'

import type { Id } from '../../../core/model'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../installationModel'
import { collectServiceBoxInstallation } from '../installationReachability'

const POSITION = { x: 0, y: 0 }

function makeElement(id: Id, type: InstallationElement['type']): InstallationElement {
  return { id, floorId: 1, type, position: POSITION, angleDeg: 0, scale: 1 }
}

function makeLine(
  id: Id,
  kind: InstallationLine['kind'],
  pointIds: readonly Id[],
  inlineElementId?: Id,
): InstallationLine {
  const points = pointIds.map((pointId, index) => ({
    id: pointId,
    position: POSITION,
    ...(index === 1 && inlineElementId !== undefined ? { inlineElementId } : {}),
  }))
  const segments = points.slice(1).map((point, index) => ({
    id: 1000 + point.id,
    fromPointId: points[index].id,
    toPointId: point.id,
  }))
  return { id, floorId: 1, kind, pipeTypeName: 'DN25', points, segments }
}

describe('collectServiceBoxInstallation', () => {
  it('servis kutusundan gaz hattı üzerinden ulaşılan her elemanı/hattı toplar', () => {
    const serviceBox = makeElement(1, 'serviceBox')
    const valve = makeElement(2, 'valve') // ana boruya OTURAN armatür (inlineElementId)
    const gasMeter = makeElement(3, 'gasMeter')
    const stove = makeElement(5, 'stove') // branşmanın ucundaki cihaz
    const strayValve = makeElement(6, 'valve') // hiçbir bağlantısı yok

    // Ana boru: kutu → (üstünde vana) → sayaç
    const mainPipe = makeLine(10, 'pipe', [100, 101, 102], valve.id)
    // Sayaçtan sonra çıkan branşman, ana boruya bir NOKTADAN bağlanır
    const branch = makeLine(12, 'branch', [120, 121])
    // Cihazın bacası — AYRI graf, gaz taşımaz, ağa girmemeli
    const chimney = makeLine(20, 'chimney', [200, 201])

    const connections: InstallationConnection[] = [
      {
        lineId: mainPipe.id,
        end: 'start',
        target: { kind: 'port', elementId: serviceBox.id, portId: 'out' },
      },
      {
        lineId: mainPipe.id,
        end: 'end',
        target: { kind: 'port', elementId: gasMeter.id, portId: 'in' },
      },
      {
        lineId: branch.id,
        end: 'start',
        target: { kind: 'line', lineId: mainPipe.id, pointId: 101 },
      },
      {
        lineId: branch.id,
        end: 'end',
        target: { kind: 'port', elementId: stove.id, portId: 'in' },
      },
      {
        lineId: chimney.id,
        end: 'start',
        target: { kind: 'outlet', elementId: stove.id, position: [0, 0], direction: [0, 1] },
      },
    ]

    const result = collectServiceBoxInstallation(
      [serviceBox, valve, gasMeter, stove, strayValve],
      [mainPipe, branch, chimney],
      connections,
      serviceBox.id,
    )

    expect(result.elementIds.sort((a, b) => a - b)).toEqual([1, 2, 3, 5])
    expect(result.lineIds.sort((a, b) => a - b)).toEqual([10, 12])
  })

  it('yalnız servis kutusu varsa (bağlantısız) kendisini döner', () => {
    const serviceBox = makeElement(1, 'serviceBox')

    const result = collectServiceBoxInstallation([serviceBox], [], [], serviceBox.id)

    expect(result).toEqual({ elementIds: [1], lineIds: [] })
  })
})
