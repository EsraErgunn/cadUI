import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import type { InstallationElementType } from '../../plumbing/core/symbolMetadata'
import type { PlanPoint } from '../coords'
import {
  DEFAULT_FLOOR_HEIGHT_CM,
  type Floor,
  type Id,
  type Opening,
  type Point,
  type PointSymbol,
  type Room,
  type Wall,
} from '../model'
import { validateProject, type ValidationRuleId, type ValidationSource } from '../validate'

export const FLOOR_ID: Id = 1

export const GROUND_FLOOR: Floor = {
  id: FLOOR_ID,
  name: 'Zemin Kat',
  heightCm: DEFAULT_FLOOR_HEIGHT_CM,
  isBasement: false,
}

/**
 * Dokümandaki iki görselin planı: 400 x 600 dikdörtgen, ortasında y=300'de
 * bölme duvarı. Alt mahal "Mutfak", üst mahal "Salon".
 *
 *   p5(0,600) ── w13 ── p4(400,600)
 *      │                    │
 *     w14                  w12
 *      │                    │
 *   p6(0,300) ── w16 ── p3(400,300)     ← w16 İÇ duvar (iki mahal arasında)
 *      │                    │
 *     w15                  w11
 *      │                    │
 *   p1(0,0)   ── w10 ── p2(400,0)
 */
export const WALL_IDS = {
  bottom: 10,
  rightLower: 11,
  rightUpper: 12,
  top: 13,
  leftUpper: 14,
  leftLower: 15,
  middle: 16,
} as const

export const ROOM_IDS = { kitchen: 20, living: 21 } as const

export const PLAN_POINTS: Point[] = [
  { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: FLOOR_ID, x: 400, y: 0 },
  { id: 3, floorId: FLOOR_ID, x: 400, y: 300 },
  { id: 4, floorId: FLOOR_ID, x: 400, y: 600 },
  { id: 5, floorId: FLOOR_ID, x: 0, y: 600 },
  { id: 6, floorId: FLOOR_ID, x: 0, y: 300 },
]

function makeWall(id: Id, p1Id: Id, p2Id: Id): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness: 20, height: 280 }
}

export const PLAN_WALLS: Wall[] = [
  makeWall(WALL_IDS.bottom, 1, 2),
  makeWall(WALL_IDS.rightLower, 2, 3),
  makeWall(WALL_IDS.rightUpper, 3, 4),
  makeWall(WALL_IDS.top, 4, 5),
  makeWall(WALL_IDS.leftUpper, 5, 6),
  makeWall(WALL_IDS.leftLower, 6, 1),
  makeWall(WALL_IDS.middle, 6, 3),
]

export const PLAN_ROOMS: Room[] = [
  {
    id: ROOM_IDS.kitchen,
    name: 'Mutfak',
    wallIds: [WALL_IDS.bottom, WALL_IDS.rightLower, WALL_IDS.middle, WALL_IDS.leftLower],
  },
  {
    id: ROOM_IDS.living,
    name: 'Salon',
    wallIds: [WALL_IDS.rightUpper, WALL_IDS.top, WALL_IDS.leftUpper, WALL_IDS.middle],
  },
]

/** Mutfağın içi / Salonun içi / plan dışı — mahal testlerinin üç referans noktası. */
export const IN_KITCHEN: PlanPoint = { x: 200, y: 150 }
export const IN_LIVING: PlanPoint = { x: 200, y: 450 }
export const OUTSIDE: PlanPoint = { x: 900, y: 900 }

export function makeDoor(id: Id, wallId: Id, offsetCm = 150): Opening {
  return { id, wallId, offsetCm, widthCm: 90, type: 'door' }
}

export function makeWindow(id: Id, wallId: Id, offsetCm = 150): Opening {
  return { id, wallId, offsetCm, widthCm: 120, type: 'window' }
}

export function makeWallVent(id: Id, wallId: Id, offsetCm = 60): PointSymbol {
  return {
    id,
    type: 'vent',
    label: `MN-0${id}`,
    note: '',
    attachment: 'wall',
    wallId,
    offsetCm,
    isMountedOnFarFace: false,
  }
}

export function makeElement(
  id: Id,
  type: InstallationElementType,
  position: PlanPoint,
  extra: Partial<InstallationElement> = {},
): InstallationElement {
  return { id, floorId: FLOOR_ID, type, position, angleDeg: 0, scale: 1, ...extra }
}

/** Marka/model dolu bir ocak — Hata4 dışındaki testler o kuralı tetiklemesin. */
export function makeStove(id: Id, position: PlanPoint): InstallationElement {
  return makeElement(id, 'stove', position, {
    stove: { brand: 'Bosch', model: 'PKE6', description: '', capacity: '', power: '' },
  })
}

export function makeMeter(id: Id, position: PlanPoint, isFilled: boolean): InstallationElement {
  return makeElement(id, 'gasMeter', position, {
    gasMeter: {
      classLabel: 'G4',
      inletConsumptionPoint: '',
      outletConsumptionPoint: '',
      isIndoor: true,
      isAccessible247: true,
      hasCorrector: false,
      unitNumber: isFilled ? '3' : '',
      subscriberNo: isFilled ? '10045' : '',
    },
  })
}

export function makeLine(
  id: Id,
  kind: InstallationLine['kind'],
  corners: readonly PlanPoint[],
  firstPointId: Id,
): InstallationLine {
  const points = corners.map((position, index) => ({ id: firstPointId + index, position }))
  return {
    id,
    floorId: FLOOR_ID,
    kind,
    pipeTypeName: 'DN25',
    points,
    segments: points.slice(1).map((point, index) => ({
      id: firstPointId + 100 + index,
      fromPointId: points[index].id,
      toPointId: point.id,
    })),
  }
}

export function connectToPort(lineId: Id, end: 'start' | 'end', elementId: Id): InstallationConnection {
  return { lineId, end, target: { kind: 'port', elementId, portId: 'in' } }
}

/** Kurallar tek tek denenebilsin diye her alanı boş bir taban. */
export function makeSource(overrides: Partial<ValidationSource> = {}): ValidationSource {
  return {
    floors: [GROUND_FLOOR],
    points: PLAN_POINTS,
    walls: PLAN_WALLS,
    openings: [],
    rooms: PLAN_ROOMS,
    symbols: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    floorPipeLinks: [],
    ...overrides,
  }
}

export const SERVICE_BOX: PlanPoint = { x: 900, y: 900 }
export const METER: PlanPoint = { x: 450, y: 150 }

/** Hiçbir kuralı ihlal etmeyen taban proje; her test bunun üstünde tek şey bozar. */
export function makeValidProject(overrides: Partial<ValidationSource> = {}): ValidationSource {
  return makeSource({
    openings: [makeDoor(30, WALL_IDS.leftLower), makeDoor(31, WALL_IDS.middle)],
    symbols: [makeWallVent(35, WALL_IDS.bottom), makeWallVent(36, WALL_IDS.leftUpper)],
    installationElements: [
      makeElement(40, 'serviceBox', SERVICE_BOX),
      makeMeter(41, METER, true),
      makeStove(42, IN_KITCHEN),
    ],
    installationLines: [
      makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
      makeLine(51, 'pipe', [METER, IN_KITCHEN], 510),
    ],
    installationConnections: [
      connectToPort(50, 'start', 40),
      connectToPort(50, 'end', 41),
      connectToPort(51, 'start', 41),
      connectToPort(51, 'end', 42),
    ],
    ...overrides,
  })
}

export function ruleIds(source: ValidationSource): ValidationRuleId[] {
  return validateProject(source).map((issue) => issue.ruleId)
}
