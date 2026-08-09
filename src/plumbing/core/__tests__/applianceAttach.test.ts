import { describe, expect, it } from 'vitest'

import { createHorizontalLine, getFixtureMetadata } from './symbolFixture'
import { resolveNearestLineAttachment } from '../elementAttach'
import type { InstallationConnection } from '../installationModel'

const NO_CONNECTIONS: readonly InstallationConnection[] = []

describe('resolveNearestLineAttachment', () => {
  const lines = [createHorizontalLine()]

  it('cihazı imleçte bırakır, vanayı en yakın AÇIK UCUN üstüne koyar', () => {
    const attachment = resolveNearestLineAttachment(
      lines,
      NO_CONNECTIONS,
      getFixtureMetadata,
      'stove',
      { x: 1000, y: 300 },
    )

    expect(attachment?.lineId).toBe(10)
    expect(attachment?.end).toBe('end')
    expect(attachment?.endPointId).toBe(2)
    expect(attachment?.nodePosition).toEqual({ x: 1000, y: 0 })
    expect(attachment?.placements[0].position).toEqual({ x: 1000, y: 300 })
    expect(attachment?.placements[1].type).toBe('valve')
    expect(attachment?.placements[1].position).toEqual({ x: 1000, y: 0 })
  })

  it('borunun ORTASINA değil, yalnız açık uca bağlanır', () => {
    // (400, 300) borunun ortasına (400, 0) ÇOK daha yakın olsa da orta nokta bir
    // uç değildir: aday yalnız iki uçtur, aralarında (400,300)'e gerçekten en
    // yakın olan başlangıç ucudur (0,0) — bitiş ucundan (1000,0) daha kısa mesafe.
    const attachment = resolveNearestLineAttachment(
      lines,
      NO_CONNECTIONS,
      getFixtureMetadata,
      'stove',
      { x: 400, y: 300 },
    )

    expect(attachment?.end).toBe('start')
    expect(attachment?.nodePosition).toEqual({ x: 0, y: 0 })
  })

  it('cihazın giriş portunu boruya çevirir; kol porttan düğüme uzanır', () => {
    const attachment = resolveNearestLineAttachment(
      lines,
      NO_CONNECTIONS,
      getFixtureMetadata,
      'stove',
      { x: 1000, y: 300 },
    )

    // Port ofseti gövdenin 30 cm solunda; boruya bakınca 30 cm ALTINDA kalır.
    expect(attachment?.inputPortPosition.x).toBeCloseTo(1000, 6)
    expect(attachment?.inputPortPosition.y).toBeCloseTo(270, 6)
  })

  it('yarıçap tanımaz: uzaktaki açık uca da bağlanır', () => {
    const attachment = resolveNearestLineAttachment(
      lines,
      NO_CONNECTIONS,
      getFixtureMetadata,
      'stove',
      { x: 1000, y: 5000 },
    )

    expect(attachment?.nodePosition).toEqual({ x: 1000, y: 0 })
  })

  it('kol sığmayacak kadar yakınsa reddeder', () => {
    expect(
      resolveNearestLineAttachment(lines, NO_CONNECTIONS, getFixtureMetadata, 'stove', {
        x: 1000,
        y: 20,
      }),
    ).toBeNull()
  })

  it('bağlı ucu atlar, diğer açık uca bağlanır', () => {
    const connections: InstallationConnection[] = [
      { lineId: 10, end: 'end', target: { kind: 'port', elementId: 99, portId: 'in' } },
    ]

    const attachment = resolveNearestLineAttachment(
      lines,
      connections,
      getFixtureMetadata,
      'stove',
      { x: 1000, y: 300 },
    )

    expect(attachment?.end).toBe('start')
    expect(attachment?.nodePosition).toEqual({ x: 0, y: 0 })
  })

  it('iki uç da doluysa null döner', () => {
    const connections: InstallationConnection[] = [
      { lineId: 10, end: 'start', target: { kind: 'port', elementId: 98, portId: 'in' } },
      { lineId: 10, end: 'end', target: { kind: 'port', elementId: 99, portId: 'in' } },
    ]

    expect(
      resolveNearestLineAttachment(lines, connections, getFixtureMetadata, 'stove', {
        x: 950,
        y: 300,
      }),
    ).toBeNull()
  })

  it('hiç boru yoksa null döner', () => {
    expect(
      resolveNearestLineAttachment([], NO_CONNECTIONS, getFixtureMetadata, 'stove', {
        x: 400,
        y: 300,
      }),
    ).toBeNull()
  })
})
