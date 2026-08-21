import { describe, expect, it } from 'vitest'

import type { Floor } from '../../../core/model'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../../plumbing/core/installationModel'
import { ISOMETRIC_ANGLES_DEFAULT } from '../isometricProjection'
import { makeTestMetadata } from './isometricTestMetadata'
import { buildIsometricScene } from '../isometricScene'
import type { IsometricSceneInput, IsometricSceneOptions } from '../isometricScene'

const GROUND: Floor = { id: 1, name: 'Zemin Kat', heightCm: 300, isBasement: false }

const NO_GAP: IsometricSceneOptions = { angles: ISOMETRIC_ANGLES_DEFAULT, getMetadata: makeTestMetadata }

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

describe('buildIsometricScene — yakıcı cihaz kolu (Adım 3)', () => {
  const hostElevationCm = 175

  /** Boru → kol → cihaz zinciri; kol kendi kotunu TAŞIMAZ. */
  function makeApplianceSetup() {
    const host = makePipe(1, GROUND.id, hostElevationCm, hostElevationCm)
    const appliance: InstallationElement = {
      id: 700,
      floorId: GROUND.id,
      type: 'combiBoiler',
      position: { x: 400, y: 260 },
      angleDeg: 0,
      scale: 1,
    }
    const stub: InstallationLine = {
      id: 20,
      floorId: GROUND.id,
      kind: 'applianceStub',
      pipeTypeName: 'DN15',
      points: [
        { id: 201, position: { x: 400, y: 0 } },
        { id: 202, position: { x: 400, y: 260 } },
      ],
      segments: [{ id: 203, fromPointId: 201, toPointId: 202 }],
    }
    const connections: InstallationConnection[] = [
      {
        lineId: stub.id,
        end: 'start',
        target: { kind: 'line', lineId: host.id, pointId: host.points[1].id },
      },
      {
        lineId: stub.id,
        end: 'end',
        target: { kind: 'port', elementId: appliance.id, portId: 'in' },
      },
    ]
    return { host, stub, appliance, connections }
  }

  it('kol, tutunduğu borunun kotunda çizilir (artık zeminde DEĞİL)', () => {
    const { host, stub, appliance, connections } = makeApplianceSetup()
    const scene = buildIsometricScene(
      makeInput({
        installationLines: [host, stub],
        installationElements: [appliance],
        installationConnections: connections,
      }),
      NO_GAP,
    )

    const stubGeometry = scene.lines.find((candidate) => candidate.lineId === stub.id)
    expect(stubGeometry).toBeDefined()
    if (!stubGeometry) return

    expect(stubGeometry.positions[0][1]).toBeCloseTo(hostElevationCm, 9)
    expect(stubGeometry.positions[1][1]).toBeCloseTo(hostElevationCm, 9)
  })

  it('cihaz sembolü kolun ucundan KOPMAZ — ikisi aynı kotta', () => {
    const { host, stub, appliance, connections } = makeApplianceSetup()
    const scene = buildIsometricScene(
      makeInput({
        installationLines: [host, stub],
        installationElements: [appliance],
        installationConnections: connections,
      }),
      NO_GAP,
    )

    const stubGeometry = scene.lines.find((candidate) => candidate.lineId === stub.id)
    expect(scene.elements[0].position[1]).toBeCloseTo(stubGeometry?.positions[1][1] ?? -1, 9)
  })

  it('boruya bağlı olmayan kol zeminde kalır', () => {
    const { stub, appliance } = makeApplianceSetup()
    const scene = buildIsometricScene(
      makeInput({ installationLines: [stub], installationElements: [appliance] }),
      NO_GAP,
    )

    expect(scene.lines[0].positions[0][1]).toBeCloseTo(0, 9)
  })
})

describe('buildIsometricScene — hat genişliği', () => {
  it('gazda çap, deşarjda tür sabiti kullanılır', () => {
    const chimney: InstallationLine = {
      id: 9,
      floorId: GROUND.id,
      kind: 'chimney',
      pipeTypeName: 'DN25',
      points: [
        { id: 91, position: { x: 0, y: 0 } },
        { id: 92, position: { x: 100, y: 0 } },
      ],
      segments: [{ id: 93, fromPointId: 91, toPointId: 92 }],
      chimney: { type: 'single', startHeightCm: 100, endHeightCm: 400 },
    }

    const scene = buildIsometricScene(
      makeInput({ installationLines: [makePipe(1, GROUND.id, 0, 0), chimney] }),
      NO_GAP,
    )

    expect(scene.lines[0].outerWidthCm).toBeCloseTo(3.37, 6)
    expect(scene.lines[1].outerWidthCm).toBeCloseTo(20, 6)
    expect(scene.lines[1].positions[1][1]).toBeCloseTo(400, 9)
  })
})
