import type { StateCreator } from 'zustand'

import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import type { Id, Point, Wall } from '../core/model'
import {
  DEFAULT_WALL_HEIGHT_CM,
  DEFAULT_WALL_THICKNESS_CM,
  getOrphanPointIds,
  getPlacementRange,
  getSegmentLength,
  getSnapPoints,
  getWallsAtPoint,
  MIN_WALL_LENGTH_CM,
  type PlacementRange,
} from '../core/wall'

/**
 * Duvar ucu ya var olan bir köşedir (snap sonucu `pointId` döndüyse) ya da yeni
 * bir konumdur. Var olan köşede yeni Point üretilmez — aynı yerde iki nokta
 * duvarları kopuk gösterir ve mahal çevrimini kapatmaz.
 */
export type WallEnd = { pointId: Id } | { position: PlanPoint }

export type AddWallInput = {
  start: WallEnd
  end: WallEnd
  thickness?: number
  height?: number
}

export type AddWallChainInput = {
  /** Zincirin noktaları; ardışık her ikisi bir duvar olur. */
  ends: readonly WallEnd[]
  thickness?: number
  height?: number
}

/** Üretilen id'ler: zinciri sürdüren çağıran, bir sonraki duvarı `p2Id`'den başlatır. */
export type AddedWall = {
  wallId: Id
  p1Id: Id
  p2Id: Id
}

export type ArchitectureSlice = {
  points: Point[]
  walls: Wall[]
  addWall: (input: AddWallInput) => AddedWall | undefined
  addWallChain: (input: AddWallChainInput) => void
  movePoint: (pointId: Id, position: PlanPoint) => void
  deleteWall: (wallId: Id) => void
}

function readEndPosition(state: ArchitectureSlice, end: WallEnd): PlanPoint | undefined {
  if (!('pointId' in end)) return end.position
  const point = state.points.find((candidate) => candidate.id === end.pointId)
  return point ? { x: point.x, y: point.y } : undefined
}

function takeEndPointId(draft: CadState, end: WallEnd, floorId: Id): Id {
  if ('pointId' in end) return end.pointId

  const id = takeNextId(draft)
  draft.points.push({ id, floorId, x: end.position.x, y: end.position.y })
  return id
}

/**
 * Tek duvarı yazar. Uçlar çözülemiyorsa (silinmiş id) veya duvar sıfır boyluysa
 * hiç dokunmaz: önce doğrula sonra yaz — yoksa geçersiz durumda sahipsiz Point kalır.
 */
function appendWall(
  draft: CadState,
  start: WallEnd,
  end: WallEnd,
  options: { thickness?: number; height?: number },
): AddedWall | undefined {
  const startPosition = readEndPosition(draft, start)
  const endPosition = readEndPosition(draft, end)
  if (!startPosition || !endPosition) return undefined
  if (getSegmentLength(startPosition, endPosition) < MIN_WALL_LENGTH_CM) return undefined

  const floorId = draft.activeFloorId
  const p1Id = takeEndPointId(draft, start, floorId)
  const p2Id = takeEndPointId(draft, end, floorId)
  const wallId = takeNextId(draft)

  draft.walls.push({
    id: wallId,
    floorId,
    p1Id,
    p2Id,
    thickness: options.thickness ?? DEFAULT_WALL_THICKNESS_CM,
    height: options.height ?? DEFAULT_WALL_HEIGHT_CM,
  })

  return { wallId, p1Id, p2Id }
}

/**
 * Zinciri tek geçişte yazar. Her segmentin sonu bir sonrakinin başlangıcı olarak
 * `pointId` ile devredilir — aynı köşede ikinci bir Point üretilmesini bu engeller.
 * Atlanan segment zinciri kesmez, çapa olduğu yerde kalır.
 */
function appendWallChain(draft: CadState, input: AddWallChainInput): boolean {
  let anchor: WallEnd | undefined
  let hasAdded = false

  for (const end of input.ends) {
    if (!anchor) {
      anchor = end
      continue
    }

    const added = appendWall(draft, anchor, end, input)
    if (!added) continue

    anchor = { pointId: added.p2Id }
    hasAdded = true
  }

  return hasAdded
}

export const createArchitectureSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  ArchitectureSlice
> = (set) => ({
  points: [],
  walls: [],

  // Üretilen id'ler dönüyor: duvar çizim aracı zinciri bu p2Id'den sürdürüyor.
  addWall: (input) => {
    let added: AddedWall | undefined
    set((draft) => {
      added = appendWall(draft, input.start, input.end, input)
      if (added) markDirty(draft)
    })
    return added
  },

  // Zincirin tamamı tek set() içinde: geri alma tek adımda tüm zinciri kaldırır.
  addWallChain: (input) =>
    set((draft) => {
      if (appendWallChain(draft, input)) markDirty(draft)
    }),

  movePoint: (pointId, position) =>
    set((draft) => {
      const point = draft.points.find((candidate) => candidate.id === pointId)
      if (!point) return

      // Tek Point güncellenir; ona bağlı tüm duvarlar referans üzerinden gelir.
      point.x = position.x
      point.y = position.y
      markDirty(draft)
    }),

  deleteWall: (wallId) =>
    set((draft) => {
      const index = draft.walls.findIndex((wall) => wall.id === wallId)
      if (index === -1) return

      draft.walls.splice(index, 1)

      // Temizlik aynı set() içinde: silme + temizlik tek geri alma adımı olsun.
      const orphanIds = new Set(getOrphanPointIds(draft.points, draft.walls))
      draft.points = draft.points.filter((point) => !orphanIds.has(point.id))
      markDirty(draft)
    }),
})

export function selectPointById(state: ArchitectureSlice, pointId: Id): Point | undefined {
  return state.points.find((point) => point.id === pointId)
}

export function selectWallById(state: ArchitectureSlice, wallId: Id): Wall | undefined {
  return state.walls.find((wall) => wall.id === wallId)
}

export function selectPointsOnFloor(state: ArchitectureSlice, floorId: Id): Point[] {
  return state.points.filter((point) => point.floorId === floorId)
}

export function selectWallsOnFloor(state: ArchitectureSlice, floorId: Id): Wall[] {
  return state.walls.filter((wall) => wall.floorId === floorId)
}

export function selectWallsAtPoint(state: ArchitectureSlice, pointId: Id): Wall[] {
  return getWallsAtPoint(pointId, state.walls)
}

/** Açıklık tarafının sözleşmesi: uç/orta/kesişim noktaları — bkz. knowledge/snap-contract.md. */
export function selectWallSnapPoints(state: ArchitectureSlice, wallId: Id): PlanPoint[] {
  const wall = selectWallById(state, wallId)
  return wall ? getSnapPoints(wall, state.points, state.walls) : []
}

/** Açıklık tarafının sözleşmesi: köşe payı dahil yerleştirme aralığı. */
export function selectWallPlacementRange(
  state: ArchitectureSlice,
  wallId: Id,
): PlacementRange | undefined {
  const wall = selectWallById(state, wallId)
  return wall ? getPlacementRange(wall, state.points, state.walls) : undefined
}
