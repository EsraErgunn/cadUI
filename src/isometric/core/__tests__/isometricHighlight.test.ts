import { describe, expect, it } from 'vitest'

import type { InstallationConnection } from '../../../plumbing/core/installationModel'
import { getConnectedElementIds } from '../isometricHighlight'

function makeConnection(
  lineId: number,
  elementId: number,
  end: InstallationConnection['end'] = 'start',
): InstallationConnection {
  return { lineId, end, target: { kind: 'port', elementId, portId: 'p1' } }
}

describe('getConnectedElementIds', () => {
  it('yalnız o hatta bağlı elemanları verir', () => {
    const connections = [makeConnection(5, 100), makeConnection(6, 200)]
    expect([...getConnectedElementIds(5, connections)]).toEqual([100])
  })

  it('aynı eleman iki uçtan bağlıysa tek kez sayılır', () => {
    const connections = [makeConnection(5, 100, 'start'), makeConnection(5, 100, 'end')]
    expect(getConnectedElementIds(5, connections).size).toBe(1)
  })

  it('bağlantısı olmayan hatta boş küme', () => {
    expect(getConnectedElementIds(9, [makeConnection(5, 100)]).size).toBe(0)
  })
})
