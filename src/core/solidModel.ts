import type { PlanPoint } from './coords'
import { getFloorElevationsCm } from './floorElevation'
import type { AreaObject, Beam, Floor, Id, Opening, Point, Room, Wall } from './model'
import { getBoundsAround } from './planBounds'
import {
  buildLevelAreaObjects,
  type SolidAreaBox,
  type SolidAreaCylinder,
} from './solidAreaObject'
import {
  buildLevelElements,
  buildLevelPipes,
  type SolidElementBox,
  type SolidPipeSegment,
} from './solidInstallation'
import { buildLevelSlabs, type SolidSlab } from './solidSlab'
import { getWallSolids, type SolidBox } from './solidWall'
import type { PlanBounds } from './viewport'
import { buildPointIndex, getSegmentAngleDeg, getSegmentLength, getSegmentMidpoint } from './wall'
import { getWallCapsuleFrom } from './wallShape'
import type { SymbolMetadataLookup } from '../plumbing/core/elementPicking'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../plumbing/core/installationModel'

export type { SolidBox } from './solidWall'
export type { SolidAreaBox, SolidAreaCylinder } from './solidAreaObject'
export type { SolidSlab } from './solidSlab'
export { ELEMENT_DEPTH_CM } from './solidInstallation'
export type { SolidElementBox, SolidPipeSegment } from './solidInstallation'

/**
 * Kirişin düşey derinliği. `Beam` modelde yükseklik TAŞIMAZ (core/model.ts:
 * "duvarın height'ı 3B için gerekiyordu, kiriş 3B'de henüz yok") — açıklık
 * yüksekliğiyle aynı gerekçe: yalnız gösterim sabiti, modele yazılmaz.
 */
export const BEAM_DEPTH_CM = 40

export type SolidFloorLevel = {
  floorId: Id
  name: string
  /** Kat tabanının kotu (cm) — zemin katın tabanı sıfır. */
  baseCm: number
  heightCm: number
}

export type SolidModel = {
  walls: SolidBox[]
  glazing: SolidBox[]
  slabs: SolidSlab[]
  beams: SolidBox[]
  areaObjects: SolidAreaBox[]
  areaCylinders: SolidAreaCylinder[]
  pipes: SolidPipeSegment[]
  elements: SolidElementBox[]
  levels: SolidFloorLevel[]
  /** Çizimin plan sınırları; kamera açılışta buna göre yerleşir. Boş projede yok. */
  bounds: PlanBounds | undefined
  /** En alt görünen kat tabanından en üst görünen kat tavanına (cm). */
  totalHeightCm: number
}

export type SolidModelInput = {
  floors: readonly Floor[]
  points: readonly Point[]
  walls: readonly Wall[]
  rooms: readonly Room[]
  openings: readonly Opening[]
  areaObjects: readonly AreaObject[]
  beams: readonly Beam[]
  installationLines: readonly InstallationLine[]
  installationElements: readonly InstallationElement[]
  installationConnections: readonly InstallationConnection[]
  /** Çizilecek katlar. Kapsam kararı (tümü / aktif kat) ÇAĞIRANIN işi. */
  visibleFloorIds: readonly Id[]
  /** Sembol kutusu sahneden gelir (`plumbing/scene/symbolLoader`); core asset okumaz. */
  getSymbolMetadata: SymbolMetadataLookup
}

const EMPTY_MODEL: SolidModel = {
  walls: [],
  glazing: [],
  slabs: [],
  beams: [],
  areaObjects: [],
  areaCylinders: [],
  pipes: [],
  elements: [],
  levels: [],
  bounds: undefined,
  totalHeightCm: 0,
}

function buildFloorLevels(
  floors: readonly Floor[],
  visibleFloorIds: readonly Id[],
): SolidFloorLevel[] {
  const elevationsCm = getFloorElevationsCm(floors)
  return floors
    .map((floor, index) => ({
      floorId: floor.id,
      name: floor.name,
      baseCm: elevationsCm[index],
      heightCm: floor.heightCm,
    }))
    .filter((level) => visibleFloorIds.includes(level.floorId))
}

function buildWallSolids(
  input: SolidModelInput,
  level: SolidFloorLevel,
  pointIndex: ReturnType<typeof buildPointIndex>,
): { walls: SolidBox[]; glazing: SolidBox[] } {
  const walls: SolidBox[] = []
  const glazing: SolidBox[] = []

  for (const wall of input.walls) {
    if (wall.floorId !== level.floorId) continue

    const capsule = getWallCapsuleFrom(wall, pointIndex)
    if (!capsule) continue

    const openings = input.openings.filter((opening) => opening.wallId === wall.id)
    const solids = getWallSolids(wall, capsule, openings, level.baseCm)
    walls.push(...solids.body)
    glazing.push(...solids.glazing)
  }

  return { walls, glazing }
}

function buildBeams(input: SolidModelInput, level: SolidFloorLevel): SolidBox[] {
  return input.beams
    .filter((beam) => beam.floorId === level.floorId)
    .flatMap((beam) => {
      const from = { x: beam.x1, y: beam.y1 }
      const to = { x: beam.x2, y: beam.y2 }
      const lengthCm = getSegmentLength(from, to)
      if (lengthCm === 0) return []

      return [
        {
          key: `beam-${beam.id}`,
          center: getSegmentMidpoint(from, to),
          lengthCm,
          widthCm: beam.thicknessCm,
          heightCm: BEAM_DEPTH_CM,
          // Kiriş tavana asılır: kat tabanı + kat yüksekliği − kendi derinliği.
          baseCm: level.baseCm + Math.max(0, level.heightCm - BEAM_DEPTH_CM),
          angleDeg: getSegmentAngleDeg(from, to),
        },
      ]
    })
}

function getModelBounds(
  model: Omit<SolidModel, 'bounds' | 'totalHeightCm'>,
): PlanBounds | undefined {
  const targets: PlanPoint[] = [
    ...model.walls.map((box) => box.center),
    ...model.areaObjects.map((box) => box.center),
    ...model.areaCylinders.map((cylinder) => cylinder.center),
    ...model.elements.map((box) => box.center),
    ...model.pipes.flatMap((segment) => [segment.from, segment.to]),
  ]
  return getBoundsAround(targets)
}

/**
 * Çizimden katı modeli türetir. Sahne bunun ÇIKTISINI çizer, kendi geometri
 * hesabını yapmaz — 2B tarafta olduğu gibi geometri `core/`de kalır (kural 1).
 */
export function buildSolidModel(input: SolidModelInput): SolidModel {
  const levels = buildFloorLevels(input.floors, input.visibleFloorIds)
  if (levels.length === 0) return EMPTY_MODEL

  // Havuz BİR kez indeksleniyor; duvar başına taransaydı O(N·P) olurdu.
  const pointIndex = buildPointIndex(input.points)

  const walls: SolidBox[] = []
  const glazing: SolidBox[] = []
  const slabs: SolidSlab[] = []
  const beams: SolidBox[] = []
  const areaObjects: SolidAreaBox[] = []
  const areaCylinders: SolidAreaCylinder[] = []
  const pipes: SolidPipeSegment[] = []
  const elements: SolidElementBox[] = []

  for (const level of levels) {
    const wallSolids = buildWallSolids(input, level, pointIndex)
    walls.push(...wallSolids.walls)
    glazing.push(...wallSolids.glazing)
    slabs.push(
      ...buildLevelSlabs(input.walls, input.points, input.rooms, level.floorId, level.baseCm),
    )
    beams.push(...buildBeams(input, level))
    const areaSolids = buildLevelAreaObjects(input.areaObjects, level.floorId, level)
    areaObjects.push(...areaSolids.boxes)
    areaCylinders.push(...areaSolids.cylinders)
    pipes.push(...buildLevelPipes(input.installationLines, level.floorId, level.baseCm))
    elements.push(
      ...buildLevelElements(
        input.installationElements,
        input.installationLines,
        input.installationConnections,
        level.floorId,
        level.baseCm,
        input.getSymbolMetadata,
      ),
    )
  }

  const parts = {
    walls, glazing, slabs, beams, areaObjects, areaCylinders, pipes, elements, levels,
  }
  const lowestCm = Math.min(...levels.map((level) => level.baseCm))
  const highestCm = Math.max(...levels.map((level) => level.baseCm + level.heightCm))

  return { ...parts, bounds: getModelBounds(parts), totalHeightCm: highestCm - lowestCm }
}
