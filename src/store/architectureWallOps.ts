// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { takeNextId } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import {
  DEFAULT_WALL_HEIGHT_CM,
  DEFAULT_WALL_THICKNESS_CM,
  getSegmentLength,
  MIN_WALL_LENGTH_CM,
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

function readEndPosition(state: Pick<CadState, 'points'>, end: WallEnd): PlanPoint | undefined {
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
export function appendWall(
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
export function appendWallChain(draft: CadState, input: AddWallChainInput): boolean {
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
