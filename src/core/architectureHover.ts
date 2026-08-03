import type { PlanPoint } from './coords'
import type { Id, Opening, Point, Wall } from './model'
import { findOpeningUnderPoint } from './openingTool'
import { findCornerPointIdAt } from './snap'
import { findWallUnderPoint } from './wallPath'

/** İmlecin altındaki nesne. Aynı anda yalnız BİRİ hedeftir. */
export type ArchitectureTarget =
  | { kind: 'point'; pointId: Id }
  | { kind: 'opening'; openingId: Id }
  | { kind: 'wall'; wallId: Id }

export type ArchitectureTargetContext = {
  points: readonly Point[]
  walls: readonly Wall[]
  openings: readonly Opening[]
  floorId: Id
  toleranceCm: number
}

/**
 * "İmlecin altında ne var" sorusunun TEK cevabı. Hem vurgu (hover) hem jest
 * sahipliği bunu okur — ikisi ayrı hesaplarsa vurgu "şunu tutarsın" der, basış
 * başka şeyi tutar (knowledge/gesture-bus-precedence.md).
 *
 * Sıra ekranda üstte durandan alta: köşe → açıklık → duvar. Köşe tutamağı en
 * üstte (HANDLE_ELEVATION_CM), açıklık duvarın üstüne boyanıyor
 * (RENDER_ORDER.opening > wall), duvar en altta.
 *
 * Köşe koşulu `findCornerPointIdAt` ile paylaşılıyor; burada ikinci kopya yazılmaz.
 */
export function resolveArchitectureTarget(
  target: PlanPoint,
  context: ArchitectureTargetContext,
): ArchitectureTarget | undefined {
  const pointId = findCornerPointIdAt(
    target,
    { points: context.points, walls: context.walls, floorId: context.floorId },
    context.toleranceCm,
  )
  if (pointId !== undefined) return { kind: 'point', pointId }

  const opening = findOpeningUnderPoint(target, context)
  if (opening) return { kind: 'opening', openingId: opening.id }

  // findWallUnderPoint kat filtresinden geçmiş dizi bekler (resolveSnap'in aksine).
  const floorPoints = context.points.filter((point) => point.floorId === context.floorId)
  const floorWalls = context.walls.filter((wall) => wall.floorId === context.floorId)

  const hit = findWallUnderPoint(target, floorWalls, floorPoints, context.toleranceCm)
  return hit ? { kind: 'wall', wallId: hit.wallId } : undefined
}

/** Aynı nesne mi? Store'a her karede yeni nesne yazılmasın diye karşılaştırılır. */
export function isSameTarget(
  a: ArchitectureTarget | undefined,
  b: ArchitectureTarget | undefined,
): boolean {
  if (!a || !b) return a === b
  if (a.kind === 'point' && b.kind === 'point') return a.pointId === b.pointId
  if (a.kind === 'opening' && b.kind === 'opening') return a.openingId === b.openingId
  if (a.kind === 'wall' && b.kind === 'wall') return a.wallId === b.wallId
  return false
}
