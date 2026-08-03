import type { PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import { findCornerPointIdAt } from './snap'
import { findWallUnderPoint } from './wallPath'

/** İmlecin altındaki nesne. Aynı anda yalnız BİRİ vurgulanır. */
export type ArchitectureHover = { kind: 'point'; pointId: Id } | { kind: 'wall'; wallId: Id }

export type ArchitectureHoverContext = {
  points: readonly Point[]
  walls: readonly Wall[]
  floorId: Id
  toleranceCm: number
}

/**
 * Vurgu sırası ekranda ÜSTTE duranın: köşe duvarı yener. Aynı sıra jest
 * önceliğiyle birebir aynı olmalı — hover kullanıcıya "basarsam neyi tutarım"ı
 * gösteriyor, farklı cevap verirse yanıltır (knowledge/gesture-bus-precedence.md).
 *
 * Köşe koşulu `findCornerPointIdAt` ile paylaşılıyor; burada ikinci bir kopya
 * yazılmaz.
 *
 * Açıklıklar duvarı BASTIRMAZ: kapı/pencerenin üstündeyken de altındaki duvar
 * vurgulanır. Açıklığa öncelik istenirse buraya findOpeningUnderPoint eklenir.
 */
export function resolveArchitectureHover(
  target: PlanPoint,
  context: ArchitectureHoverContext,
): ArchitectureHover | undefined {
  const pointId = findCornerPointIdAt(
    target,
    { points: context.points, walls: context.walls, floorId: context.floorId },
    context.toleranceCm,
  )
  if (pointId !== undefined) return { kind: 'point', pointId }

  // findWallUnderPoint kat filtresinden geçmiş dizi bekler (resolveSnap'in aksine).
  const floorPoints = context.points.filter((point) => point.floorId === context.floorId)
  const floorWalls = context.walls.filter((wall) => wall.floorId === context.floorId)

  const hit = findWallUnderPoint(target, floorWalls, floorPoints, context.toleranceCm)
  return hit ? { kind: 'wall', wallId: hit.wallId } : undefined
}

/** Aynı nesne mi? Store'a her karede yeni nesne yazılmasın diye karşılaştırılır. */
export function isSameHover(
  a: ArchitectureHover | undefined,
  b: ArchitectureHover | undefined,
): boolean {
  if (!a || !b) return a === b
  if (a.kind === 'point' && b.kind === 'point') return a.pointId === b.pointId
  if (a.kind === 'wall' && b.kind === 'wall') return a.wallId === b.wallId
  return false
}
