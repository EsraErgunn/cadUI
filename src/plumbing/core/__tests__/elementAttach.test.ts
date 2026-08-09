import { describe, expect, it } from 'vitest'

import { createHorizontalLine, getFixtureMetadata } from './symbolFixture'
import {
  resolveFreeEndAttachment,
  resolveOnLineAttachment,
  resolveOnLineSlide,
} from '../elementAttach'
import type { InstallationConnection, InstallationLine } from '../installationModel'

const NO_CONNECTIONS: readonly InstallationConnection[] = []
const SNAP_RADIUS_CM = 20
const FLOOR_ID = 1
const VALVE_ELEMENT_ID = 99

/** Ortasında (400,0) bir vana oturan yatay boru: iki SABİT komşu köşe var. */
function createLineWithInlineValve(): InstallationLine {
  return {
    id: 10,
    floorId: FLOOR_ID,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: 1, position: { x: 0, y: 0 } },
      { id: 2, position: { x: 400, y: 0 }, inlineElementId: VALVE_ELEMENT_ID },
      { id: 3, position: { x: 1000, y: 0 } },
    ],
    segments: [
      { id: 4, fromPointId: 1, toPointId: 2 },
      { id: 5, fromPointId: 2, toPointId: 3 },
    ],
  }
}

describe('resolveOnLineAttachment', () => {
  const lines = [createHorizontalLine()]

  it('akış geçişli armatürü borunun üstüne, boruyla aynı açıyla oturtur', () => {
    const attachment = resolveOnLineAttachment(
      lines,
      getFixtureMetadata,
      'valve',
      { x: 400, y: 5 },
      SNAP_RADIUS_CM,
    )

    expect(attachment?.lineId).toBe(10)
    expect(attachment?.segmentIndex).toBe(0)
    expect(attachment?.nodes).toHaveLength(1)
    expect(attachment?.nodes[0].nodePosition).toEqual({ x: 400, y: 0 })
    expect(attachment?.nodes[0].placement.position).toEqual({ x: 400, y: 0 })
    expect(attachment?.nodes[0].placement.angleDeg).toBe(0)
  })

  it('tek bağlantılı elemanı düğümün üstüne değil YANINA koyar, portu boruya değer', () => {
    const attachment = resolveOnLineAttachment(
      lines,
      getFixtureMetadata,
      'manometer',
      { x: 400, y: 5 },
      SNAP_RADIUS_CM,
    )

    // Port ofseti (0, −14): gövde borunun 14 cm üstünde kalır.
    expect(attachment?.nodes[0].nodePosition).toEqual({ x: 400, y: 0 })
    expect(attachment?.nodes[0].placement.position).toEqual({ x: 400, y: 14 })
  })

  it('yarıçap dışında null döner', () => {
    expect(
      resolveOnLineAttachment(
        lines,
        getFixtureMetadata,
        'valve',
        { x: 400, y: 50 },
        SNAP_RADIUS_CM,
      ),
    ).toBeNull()
  })

  it('hiç boru yoksa null döner', () => {
    expect(
      resolveOnLineAttachment([], getFixtureMetadata, 'valve', { x: 400, y: 0 }, SNAP_RADIUS_CM),
    ).toBeNull()
  })

  it('regülatörü iki vana ve iki manometresiyle birlikte boru yönünde sıralar', () => {
    const attachment = resolveOnLineAttachment(
      lines,
      getFixtureMetadata,
      'regulator',
      { x: 400, y: 5 },
      SNAP_RADIUS_CM,
    )
    const nodes = attachment?.nodes ?? []

    expect(nodes.map((node) => node.placement.type)).toEqual([
      'valve',
      'manometer',
      'regulator',
      'manometer',
      'valve',
    ])
    expect(nodes.map((node) => node.nodePosition.x)).toEqual([341, 374, 400, 426, 459])
    // Manometrelerin düğümü boruda, gövdesi yanda: ikisi aynı yer DEĞİL.
    expect(nodes[1].placement.position).toEqual({ x: 374, y: 14 })
    expect(nodes[3].placement.position).toEqual({ x: 426, y: 14 })
  })

  it('refakatçilerden biri parçaya sığmıyorsa yerleşimi tümüyle reddeder', () => {
    // Giriş vanası −59 cm'de: parçanın başına 50 cm kala hiçbiri sığmaz.
    expect(
      resolveOnLineAttachment(
        lines,
        getFixtureMetadata,
        'regulator',
        { x: 50, y: 0 },
        SNAP_RADIUS_CM,
      ),
    ).toBeNull()
    // Çıkış vanası +59 cm'de: parçanın sonuna 40 cm kala taşar.
    expect(
      resolveOnLineAttachment(
        lines,
        getFixtureMetadata,
        'regulator',
        { x: 960, y: 0 },
        SNAP_RADIUS_CM,
      ),
    ).toBeNull()
  })

  it('köşenin dibindeki yerleşimi reddeder, kaydırmaz', () => {
    expect(
      resolveOnLineAttachment(
        lines,
        getFixtureMetadata,
        'valve',
        { x: 0.5, y: 0 },
        SNAP_RADIUS_CM,
      ),
    ).toBeNull()
  })
})

describe('resolveFreeEndAttachment', () => {
  const lines = [createHorizontalLine()]

  it('sayacı boş uca takar, araya vana koyar ve hattı sayacın girişine uzatır', () => {
    const attachment = resolveFreeEndAttachment(
      lines,
      NO_CONNECTIONS,
      getFixtureMetadata,
      'gasMeter',
      { x: 1005, y: 0 },
      SNAP_RADIUS_CM,
    )

    expect(attachment?.end).toBe('end')
    expect(attachment?.endPointId).toBe(2)
    expect(attachment?.inputPortId).toBe('in')
    // Vananın yarı boyu (16) + serbest pay (10) = 26 cm ötede.
    expect(attachment?.extendTo).toEqual({ x: 1026, y: 0 })

    expect(attachment?.placements[1].type).toBe('valve')
    // Vana hattın ESKİ ucundaki düğümde: boru ile sayaç arasında kalır.
    expect(attachment?.placements[1].position).toEqual({ x: 1000, y: 0 })
    // Sayacın portları gövdesinin 33 cm üstünde: gövde o kadar aşağı düşer.
    expect(attachment?.placements[0].position).toEqual({ x: 1036, y: -33 })
    expect(attachment?.placements[0].angleDeg).toBe(0)
  })

  it('baştan takıldığında elemanı ters yöne çevirir', () => {
    const attachment = resolveFreeEndAttachment(
      lines,
      NO_CONNECTIONS,
      getFixtureMetadata,
      'gasMeter',
      { x: -5, y: 0 },
      SNAP_RADIUS_CM,
    )

    expect(attachment?.end).toBe('start')
    expect(attachment?.extendTo).toEqual({ x: -26, y: 0 })
    expect(attachment?.placements[0].angleDeg).toBe(180)
  })

  it('bağlı ucu aday göstermez', () => {
    const connections: InstallationConnection[] = [
      { lineId: 10, end: 'end', target: { kind: 'port', elementId: 99, portId: 'in' } },
    ]

    expect(
      resolveFreeEndAttachment(
        lines,
        connections,
        getFixtureMetadata,
        'gasMeter',
        { x: 1005, y: 0 },
        SNAP_RADIUS_CM,
      ),
    ).toBeNull()
  })
})

describe('resolveOnLineSlide', () => {
  const lines = [createLineWithInlineValve()]

  it('düğümü komşu köşeler arasındaki hatta izdüşürür, borunun şeklini değiştirmez', () => {
    const result = resolveOnLineSlide(lines, getFixtureMetadata, VALVE_ELEMENT_ID, 'valve', 0, {
      x: 600,
      y: 5,
    })

    expect(result?.lineId).toBe(10)
    expect(result?.pointId).toBe(2)
    // Dikey sapma (y=5) yok sayılır: komşular arası hat yatay (y=0).
    expect(result?.nodePosition).toEqual({ x: 600, y: 0 })
    expect(result?.elementPosition).toEqual({ x: 600, y: 0 })
  })

  it('komşu köşenin dışına taşan sürükleme o köşeye YAPIŞIR, boruyu BÜKMEZ', () => {
    const result = resolveOnLineSlide(lines, getFixtureMetadata, VALVE_ELEMENT_ID, 'valve', 0, {
      x: 5000,
      y: 300,
    })

    expect(result?.nodePosition).toEqual({ x: 1000, y: 0 })
  })

  it('elemanın iki komşusu da yoksa (hattın tam ucunda) null döner', () => {
    const line: InstallationLine = {
      id: 20,
      floorId: FLOOR_ID,
      kind: 'pipe',
      pipeTypeName: 'DN25',
      points: [
        { id: 1, position: { x: 0, y: 0 }, inlineElementId: VALVE_ELEMENT_ID },
        { id: 2, position: { x: 1000, y: 0 } },
      ],
      segments: [{ id: 3, fromPointId: 1, toPointId: 2 }],
    }

    expect(
      resolveOnLineSlide([line], getFixtureMetadata, VALVE_ELEMENT_ID, 'valve', 0, {
        x: 400,
        y: 0,
      }),
    ).toBeNull()
  })

  it('elemanın oturduğu düğüm bulunamazsa null döner', () => {
    expect(
      resolveOnLineSlide(lines, getFixtureMetadata, 12345, 'valve', 0, { x: 400, y: 0 }),
    ).toBeNull()
  })

  it('yarıçap dışında null döner', () => {
    expect(
      resolveFreeEndAttachment(
        lines,
        NO_CONNECTIONS,
        getFixtureMetadata,
        'gasMeter',
        { x: 1100, y: 0 },
        SNAP_RADIUS_CM,
      ),
    ).toBeNull()
  })
})
