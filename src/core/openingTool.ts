import type { PlanPoint } from './coords'
import type { Id, Opening, OpeningType, Point, Wall } from './model'
import {
  getOpeningOutline,
  getOpeningSpan,
  getOpeningsOnWall,
  isPlacementValid,
} from './opening'
import { findCornerPointIdAt } from './snap'
import { getPlacementRange } from './wall'
import { findWallUnderPoint, getSnapOffsetsCm, snapOffsetCm } from './wallPath'

export type OpeningPreview = {
  wallId: Id
  offsetCm: number
  widthCm: number
  type: OpeningType
  /** false ise yerleştirme/taşıma REDDEDİLİR, kaydırılmaz (K13). Hayalet uyarı renginde çizilir. */
  isValid: boolean
  outline: readonly PlanPoint[]
}

export type OpeningToolContext = {
  points: readonly Point[]
  walls: readonly Wall[]
  openings: readonly Opening[]
  floorId: Id
  toleranceCm: number
}

export type OpeningPreviewRequest = {
  type: OpeningType
  widthCm: number
  /** Taşıma modunda taşınan açıklık; çakışma kontrolünde yok sayılır. */
  movingOpeningId?: Id
  /**
   * Taşımada imlecin yakaladığı nokta ile açıklığın ortası arasındaki fark.
   * Olmadan açıklık tutulduğu anda ortası imlece zıplar (120 cm pencerede 60 cm).
   * Yeni yerleştirmede yok: orta zaten imlecin olduğu yerdir.
   */
  grabDeltaCm?: number
}

/**
 * Hangi duvar + duvar üzerinde nerede + geçerli mi — hepsi saf. Hem yerleştirme
 * hem taşıma önizlemesi bunu kullanır, iki ayrı kopya tutulmaz.
 */
export function resolveOpeningPreview(
  target: PlanPoint,
  context: OpeningToolContext,
  request: OpeningPreviewRequest,
): OpeningPreview | undefined {
  const resolved = resolveWallAndOffset(target, context, request.grabDeltaCm ?? 0)
  if (!resolved) return undefined

  const { wall, offsetCm, floorPoints, floorWalls } = resolved

  const range = getPlacementRange(wall, floorPoints, floorWalls)
  if (!range) return undefined

  const outline = getOpeningOutline(wall, floorPoints, { offsetCm, widthCm: request.widthCm })
  if (!outline) return undefined

  return {
    wallId: wall.id,
    offsetCm,
    widthCm: request.widthCm,
    type: request.type,
    isValid: isPlacementValid(
      {
        wallId: wall.id,
        offsetCm,
        widthCm: request.widthCm,
        ignoreOpeningId: request.movingOpeningId,
      },
      range,
      context.openings,
    ),
    outline,
  }
}

export type OpeningGrab = {
  opening: Opening
  /**
   * Açıklığın ortası ile imlecin yakaladığı ham nokta arasındaki fark.
   * Sürükleme boyunca korunur; olmadan açıklık tutulduğu an imlece zıplar.
   */
  grabDeltaCm: number
}

/**
 * Var olan açıklığa mı basıldı? Yeni geometri yok — mevcut fonksiyonların
 * bileşimi. İsabet testi HAM izdüşümü kullanır: snap'lenmiş offset kenardaki
 * tıklamayı yanlışlıkla açıklığın içine çekerdi.
 */
export function findOpeningGrab(
  target: PlanPoint,
  context: OpeningToolContext,
): OpeningGrab | undefined {
  const resolved = resolveWallAndOffset(target, context, 0)
  if (!resolved) return undefined

  const opening = getOpeningsOnWall(resolved.wall.id, context.openings).find((candidate) => {
    const [startCm, endCm] = getOpeningSpan(candidate)
    return resolved.rawOffsetCm >= startCm && resolved.rawOffsetCm <= endCm
  })
  if (!opening) return undefined

  return { opening, grabDeltaCm: opening.offsetCm - resolved.rawOffsetCm }
}

export function findOpeningUnderPoint(
  target: PlanPoint,
  context: OpeningToolContext,
): Opening | undefined {
  return findOpeningGrab(target, context)?.opening
}

/**
 * Köşe tutamağı açıklıktan önce gelir. Seçim aracında aynı basışı
 * usePointDragTool da köşe sürüklemesi sayıyor; ikisi birden başlarsa tek
 * bırakma iki ayrı store yazımı (iki Ctrl+Z) üretir. Koşul oradakiyle bilerek
 * AYNI: resolveSnap → kind 'point'.
 */
export function isCornerHandleAtPoint(target: PlanPoint, context: OpeningToolContext): boolean {
  // Koşul artık snap.ts'te TEK yerde: hover da aynı fonksiyonu çağırıyor.
  return (
    findCornerPointIdAt(
      target,
      { points: context.points, walls: context.walls, floorId: context.floorId },
      context.toleranceCm,
    ) !== undefined
  )
}

type ResolvedWallOffset = {
  wall: Wall
  /** Snap uygulanmış offset — yerleştirme/taşıma bunu kullanır. */
  offsetCm: number
  /** Ham izdüşüm — isabet testi (hangi açıklığa basıldı) bunu kullanır. */
  rawOffsetCm: number
  floorPoints: readonly Point[]
  floorWalls: readonly Wall[]
}

function resolveWallAndOffset(
  target: PlanPoint,
  context: OpeningToolContext,
  grabDeltaCm: number,
): ResolvedWallOffset | undefined {
  const floorPoints = context.points.filter((point) => point.floorId === context.floorId)
  const floorWalls = context.walls.filter((wall) => wall.floorId === context.floorId)

  const hit = findWallUnderPoint(target, floorWalls, floorPoints, context.toleranceCm)
  if (!hit) return undefined

  const wall = floorWalls.find((candidate) => candidate.id === hit.wallId)
  if (!wall) return undefined

  const rawOffsetCm = hit.offsetCm + grabDeltaCm

  return {
    wall,
    offsetCm: snapOffsetCm(
      rawOffsetCm,
      getSnapOffsetsCm(wall, floorPoints, floorWalls),
      context.toleranceCm,
    ),
    rawOffsetCm: hit.offsetCm,
    floorPoints,
    floorWalls,
  }
}
