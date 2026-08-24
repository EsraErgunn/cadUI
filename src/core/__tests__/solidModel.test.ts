import { describe, expect, it } from 'vitest'

import type { InstallationElement, InstallationLine } from '../../plumbing/core/installationModel'
import type { SymbolMetadata } from '../../plumbing/core/symbolMetadata'
import type { Beam, Floor, Point, Wall } from '../model'
import { BEAM_DEPTH_CM, ELEMENT_DEPTH_CM, buildSolidModel, type SolidModelInput } from '../solidModel'

const GROUND_ID = 1
const UPPER_ID = 2
const FLOOR_HEIGHT_CM = 300

const floors: Floor[] = [
  { id: GROUND_ID, name: 'Zemin Kat', heightCm: FLOOR_HEIGHT_CM, isBasement: false },
  { id: UPPER_ID, name: '1. Kat', heightCm: FLOOR_HEIGHT_CM, isBasement: false },
]

/** Her katta aynı yerde yatay bir duvar: kotların üst üste bindiği görülsün. */
function makeFloorPlan(floorId: number, pointIdBase: number): { points: Point[]; walls: Wall[] } {
  return {
    points: [
      { id: pointIdBase, floorId, x: 0, y: 0 },
      { id: pointIdBase + 1, floorId, x: 400, y: 0 },
    ],
    walls: [
      {
        id: pointIdBase + 100,
        floorId,
        p1Id: pointIdBase,
        p2Id: pointIdBase + 1,
        thickness: 20,
        height: 280,
      },
    ],
  }
}

const ground = makeFloorPlan(GROUND_ID, 10)
const upper = makeFloorPlan(UPPER_ID, 20)

const symbolMetadata: SymbolMetadata = {
  id: 'valve',
  label: 'Vana',
  asset: 'valve.svg',
  viewBox: [0, 0, 20, 20],
  origin: [0, 0],
  ports: [],
  bounds: { min: [-10, -10], max: [10, 10] },
}

function makeInput(overrides: Partial<SolidModelInput> = {}): SolidModelInput {
  return {
    floors,
    points: [...ground.points, ...upper.points],
    walls: [...ground.walls, ...upper.walls],
    rooms: [],
    openings: [],
    areaObjects: [],
    beams: [],
    installationLines: [],
    installationElements: [],
    installationConnections: [],
    visibleFloorIds: [GROUND_ID, UPPER_ID],
    getSymbolMetadata: () => symbolMetadata,
    ...overrides,
  }
}

describe('buildSolidModel', () => {
  it('katları kendi kotlarına oturtur ve bina yüksekliğini toplar', () => {
    const model = buildSolidModel(makeInput())

    expect(model.levels.map((level) => level.baseCm)).toEqual([0, FLOOR_HEIGHT_CM])
    expect(model.totalHeightCm).toBe(FLOOR_HEIGHT_CM * 2)
    expect(model.walls.map((box) => box.baseCm).sort((a, b) => a - b)).toEqual([
      0,
      FLOOR_HEIGHT_CM,
    ])
  })

  it('kapsam daraltılınca yalnız istenen kat çizilir', () => {
    const model = buildSolidModel(makeInput({ visibleFloorIds: [UPPER_ID] }))

    expect(model.levels).toHaveLength(1)
    expect(model.walls.every((box) => box.baseCm === FLOOR_HEIGHT_CM)).toBe(true)
    // Yükseklik yalnız GÖRÜNEN kattan: bina değil, çizilen kütle ölçülüyor.
    expect(model.totalHeightCm).toBe(FLOOR_HEIGHT_CM)
  })

  it('görünür kat kalmayınca boş model döner', () => {
    expect(buildSolidModel(makeInput({ visibleFloorIds: [] })).walls).toEqual([])
  })

  it('boru kotu kat tabanının ÜSTÜNE biner ve uçlar arasında oranlanır', () => {
    const line: InstallationLine = {
      id: 50,
      floorId: UPPER_ID,
      kind: 'pipe',
      pipeTypeName: 'DN25',
      points: [
        { id: 51, position: { x: 0, y: 0 } },
        { id: 52, position: { x: 100, y: 0 } },
        { id: 53, position: { x: 200, y: 0 } },
      ],
      segments: [],
      pipe: { startHeightCm: 0, endHeightCm: 200, description: '' },
    }
    const model = buildSolidModel(makeInput({ installationLines: [line] }))

    expect(model.pipes).toHaveLength(2)
    expect(model.pipes[0].fromElevationCm).toBe(FLOOR_HEIGHT_CM)
    // Ortadaki nokta yolun yarısında: 200'ün yarısı + kat tabanı.
    expect(model.pipes[0].toElevationCm).toBe(FLOOR_HEIGHT_CM + 100)
    expect(model.pipes[1].toElevationCm).toBe(FLOOR_HEIGHT_CM + 200)
    // Yarıçap çaptan geliyor (DN25 → 3.37 cm dış çap), uydurulmuyor.
    expect(model.pipes[0].radiusCm).toBeCloseTo(3.37 / 2)
  })

  it('kotu olmayan hat türü kat tabanında kalır — varsayılan bir yükseklik uydurulmaz', () => {
    const chimney: InstallationLine = {
      id: 60,
      floorId: GROUND_ID,
      kind: 'chimney',
      pipeTypeName: 'DN25',
      points: [
        { id: 61, position: { x: 0, y: 0 } },
        { id: 62, position: { x: 100, y: 0 } },
      ],
      segments: [],
    }
    const model = buildSolidModel(makeInput({ installationLines: [chimney] }))

    expect(model.pipes[0].fromElevationCm).toBe(0)
    expect(model.pipes[0].toElevationCm).toBe(0)
  })

  it('eleman ayak izini sembolün kutusundan alır, kotunun ORTASINA oturur', () => {
    const element: InstallationElement = {
      id: 70,
      floorId: GROUND_ID,
      type: 'valve',
      position: { x: 50, y: 50 },
      angleDeg: 90,
      scale: 2,
    }
    const model = buildSolidModel(makeInput({ installationElements: [element] }))

    expect(model.elements).toHaveLength(1)
    // bounds 20×20, ölçek 2 → 40×40. Sabit bir boy YAZILMIYOR.
    expect(model.elements[0].lengthCm).toBe(40)
    expect(model.elements[0].widthCm).toBe(40)
    expect(model.elements[0].angleDeg).toBe(90)
    // Bağlı borusu yok → kot 0; kutu kotun ortasında olduğu için yarısı altta.
    expect(model.elements[0].baseCm).toBe(-ELEMENT_DEPTH_CM / 2)
  })

  it('kiriş kendi katının TAVANINA asılır', () => {
    const beam: Beam = {
      id: 80,
      floorId: UPPER_ID,
      x1: 0,
      y1: 0,
      x2: 300,
      y2: 0,
      thicknessCm: 25,
      label: 'K-01',
    }
    const model = buildSolidModel(makeInput({ beams: [beam] }))

    expect(model.beams).toHaveLength(1)
    expect(model.beams[0].baseCm).toBe(FLOOR_HEIGHT_CM * 2 - BEAM_DEPTH_CM)
    expect(model.beams[0].lengthCm).toBe(300)
    expect(model.beams[0].widthCm).toBe(25)
  })
})
