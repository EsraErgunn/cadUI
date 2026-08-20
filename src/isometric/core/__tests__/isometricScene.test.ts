import { describe, expect, it } from 'vitest'

import type { Floor } from '../../../core/model'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../../plumbing/core/installationModel'
import { ISOMETRIC_ANGLES_DEFAULT, projectIsometric } from '../isometricProjection'
import { buildIsometricScene } from '../isometricScene'
import type { IsometricSceneInput, IsometricSceneOptions } from '../isometricScene'

const GROUND: Floor = { id: 1, name: 'Zemin Kat', heightCm: 300, isBasement: false }
const FIRST: Floor = { id: 2, name: '1. Kat', heightCm: 280, isBasement: false }
const BASEMENT: Floor = { id: 3, name: 'Bodrum', heightCm: 250, isBasement: true }

const NO_GAP: IsometricSceneOptions = { angles: ISOMETRIC_ANGLES_DEFAULT }

function makePipe(
  id: number,
  floorId: number,
  startHeightCm: number,
  endHeightCm: number,
): InstallationLine {
  return {
    id,
    floorId,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: id * 100 + 1, position: { x: 0, y: 0 } },
      { id: id * 100 + 2, position: { x: 400, y: 0 } },
    ],
    segments: [{ id: id * 100 + 9, fromPointId: id * 100 + 1, toPointId: id * 100 + 2 }],
    pipe: { startHeightCm, endHeightCm, description: '' },
  }
}

function makeInput(overrides: Partial<IsometricSceneInput> = {}): IsometricSceneInput {
  return {
    floors: [GROUND],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    floorPipeLinks: [],
    ...overrides,
  }
}

describe('buildIsometricScene — kat kotları', () => {
  it('üst kat, altındaki katın yüksekliği kadar yukarıda çizilir', () => {
    const scene = buildIsometricScene(
      makeInput({
        floors: [GROUND, FIRST],
        installationLines: [makePipe(1, GROUND.id, 50, 50), makePipe(2, FIRST.id, 50, 50)],
      }),
      NO_GAP,
    )

    const groundY = scene.lines[0].positions[0][1]
    const firstY = scene.lines[1].positions[0][1]
    expect(firstY - groundY).toBeCloseTo(GROUND.heightCm, 9)
  })

  it('bodrum NEGATİF kotta durur, zemin kat referans sıfırdır', () => {
    const scene = buildIsometricScene(
      makeInput({
        floors: [BASEMENT, GROUND],
        installationLines: [makePipe(1, BASEMENT.id, 0, 0), makePipe(2, GROUND.id, 0, 0)],
      }),
      NO_GAP,
    )

    expect(scene.lines[0].positions[0][1]).toBeCloseTo(-BASEMENT.heightCm, 9)
    expect(scene.lines[1].positions[0][1]).toBeCloseTo(0, 9)
  })

  it('boru kotu köşeler arasında enterpole edilir', () => {
    const line = makePipe(1, GROUND.id, 0, 200)
    const scene = buildIsometricScene(
      makeInput({ installationLines: [line] }),
      NO_GAP,
    )

    expect(scene.lines[0].positions[0][1]).toBeCloseTo(0, 9)
    expect(scene.lines[0].positions[1][1]).toBeCloseTo(200, 9)
  })

  it('bilinmeyen kata bağlı hat sahneye GİRMEZ', () => {
    const scene = buildIsometricScene(
      makeInput({ installationLines: [makePipe(1, 999, 0, 0)] }),
      NO_GAP,
    )
    expect(scene.lines).toHaveLength(0)
  })
})

describe('buildIsometricScene — izometrik kaydırma', () => {
  it('kaydırma dünyaya taşınır ve geri izdüşürülünce aynı 2B değeri verir', () => {
    const line = makePipe(1, GROUND.id, 0, 0)
    line.points[1].isometricOffsetCm = { x: 60, y: -140 }

    const scene = buildIsometricScene(
      makeInput({ installationLines: [line] }),
      NO_GAP,
    )

    const plain = projectIsometric(scene.lines[0].positions[0], ISOMETRIC_ANGLES_DEFAULT)
    const moved = projectIsometric(scene.lines[0].positions[1], ISOMETRIC_ANGLES_DEFAULT)

    // Plan farkı da var; kaydırmanın etkisi kaydırmasız hâlle karşılaştırılır.
    const withoutOffset = buildIsometricScene(
      makeInput({ installationLines: [makePipe(1, GROUND.id, 0, 0)] }),
      NO_GAP,
    )
    const reference = projectIsometric(withoutOffset.lines[0].positions[1], ISOMETRIC_ANGLES_DEFAULT)

    expect(moved.x - reference.x).toBeCloseTo(60, 6)
    expect(moved.y - reference.y).toBeCloseTo(-140, 6)
    expect(plain).toEqual(projectIsometric(withoutOffset.lines[0].positions[0], ISOMETRIC_ANGLES_DEFAULT))
  })

  it('miras kalan kaydırma da uygulanır', () => {
    const line = makePipe(1, GROUND.id, 0, 0)
    line.points[1].inheritedIsometricOffsetCm = { x: 10, y: 10 }
    line.points[1].isometricOffsetCm = { x: 5, y: 5 }

    const scene = buildIsometricScene(
      makeInput({ installationLines: [line] }),
      NO_GAP,
    )
    const reference = buildIsometricScene(
      makeInput({ installationLines: [makePipe(1, GROUND.id, 0, 0)] }),
      NO_GAP,
    )

    const moved = projectIsometric(scene.lines[0].positions[1], ISOMETRIC_ANGLES_DEFAULT)
    const plain = projectIsometric(reference.lines[0].positions[1], ISOMETRIC_ANGLES_DEFAULT)

    expect(moved.x - plain.x).toBeCloseTo(15, 6)
    expect(moved.y - plain.y).toBeCloseTo(15, 6)
  })
})

describe('buildIsometricScene — kat geçişi bağlantısı', () => {
  it('iki katın noktalarını, hat geometrisindeki KONUMLARIYLA bağlar', () => {
    const below = makePipe(1, GROUND.id, 0, 250)
    const above = makePipe(2, FIRST.id, 0, 100)

    const scene = buildIsometricScene(
      makeInput({
        floors: [GROUND, FIRST],
        installationLines: [below, above],
        floorPipeLinks: [
          {
            id: 77,
            belowFloorId: GROUND.id,
            aboveFloorId: FIRST.id,
            belowPointId: below.points[1].id,
            abovePointId: above.points[0].id,
            position: { x: 400, y: 0 },
          },
        ],
      }),
      NO_GAP,
    )

    expect(scene.floorLinks).toHaveLength(1)
    expect(scene.floorLinks[0].from).toEqual(scene.lines[0].positions[1])
    expect(scene.floorLinks[0].to).toEqual(scene.lines[1].positions[0])
    // Alt uç 250, üst uç 300 + 0 → bağlantı gerçekten yukarı çıkar.
    expect(scene.floorLinks[0].to[1]).toBeGreaterThan(scene.floorLinks[0].from[1])
  })

  it('ucu bulunamayan bağlantı sessizce düşer', () => {
    const scene = buildIsometricScene(
      makeInput({
        installationLines: [makePipe(1, GROUND.id, 0, 0)],
        floorPipeLinks: [
          {
            id: 77,
            belowFloorId: GROUND.id,
            aboveFloorId: FIRST.id,
            belowPointId: 12345,
            abovePointId: 54321,
            position: { x: 0, y: 0 },
          },
        ],
      }),
      NO_GAP,
    )
    expect(scene.floorLinks).toHaveLength(0)
  })
})

describe('buildIsometricScene — elemanlar ve sınırlar', () => {
  const meter: InstallationElement = {
    id: 500,
    floorId: FIRST.id,
    type: 'gasMeter',
    position: { x: 100, y: 100 },
    angleDeg: 0,
    scale: 1,
  }
  const meterPipe = makePipe(9, FIRST.id, 200, 200)
  const meterConnection: InstallationConnection = {
    lineId: meterPipe.id,
    end: 'start',
    target: { kind: 'port', elementId: meter.id, portId: 'in' },
  }

  it('eleman kotu kat tabanı ile bağlı borusunun kotunun TOPLAMI', () => {
    const scene = buildIsometricScene(
      makeInput({
        floors: [GROUND, FIRST],
        installationElements: [meter],
        installationLines: [meterPipe],
        installationConnections: [meterConnection],
      }),
      NO_GAP,
    )

    expect(scene.elements[0].position[1]).toBeCloseTo(GROUND.heightCm + 200, 9)
  })

  it('hiçbir şeye bağlanmamış eleman kat tabanında durur', () => {
    const scene = buildIsometricScene(
      makeInput({ floors: [GROUND, FIRST], installationElements: [meter] }),
      NO_GAP,
    )

    expect(scene.elements[0].position[1]).toBeCloseTo(GROUND.heightCm, 9)
  })

  it('boş çizimde sınırlar null', () => {
    const scene = buildIsometricScene(makeInput(), NO_GAP)
    expect(scene.bounds).toBeNull()
  })

  it('sınırlar hat ve elemanların hepsini kapsar', () => {
    const scene = buildIsometricScene(
      makeInput({
        floors: [GROUND, FIRST],
        installationLines: [makePipe(1, GROUND.id, 0, 150), meterPipe],
        installationElements: [meter],
        installationConnections: [meterConnection],
      }),
      NO_GAP,
    )

    expect(scene.bounds).not.toBeNull()
    if (!scene.bounds) return
    expect(scene.bounds.min[1]).toBeCloseTo(0, 9)
    expect(scene.bounds.max[1]).toBeCloseTo(GROUND.heightCm + 200, 9)
    expect(scene.bounds.sizeCm).toBeGreaterThan(0)
  })
})
