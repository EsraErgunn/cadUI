import { isPointInSymbol } from './architectureSymbol'
import { isPointInAreaObject } from './areaObject'
import { findBeamUnderPoint } from './beam'
import type { PlanPoint } from './coords'
import type { AreaObject, Beam, Id, Opening, Point, PointSymbol, Wall } from './model'
import { findOpeningUnderPoint } from './openingTool'
import { findCornerPointIdAt } from './snap'
import { getSymbolPose, isSymbolOnFloor } from './symbolPlacement'
import { findWallUnderPoint } from './wallPath'

/** İmlecin altındaki nesne. Aynı anda yalnız BİRİ hedeftir. */
export type ArchitectureTarget =
  | { kind: 'point'; pointId: Id }
  | { kind: 'symbol'; symbolId: Id }
  | { kind: 'area'; areaObjectId: Id }
  | { kind: 'beam'; beamId: Id }
  | { kind: 'opening'; openingId: Id }
  | { kind: 'wall'; wallId: Id }

export type ArchitectureTargetContext = {
  points: readonly Point[]
  walls: readonly Wall[]
  openings: readonly Opening[]
  symbols: readonly PointSymbol[]
  areaObjects: readonly AreaObject[]
  beams: readonly Beam[]
  floorId: Id
  toleranceCm: number
}

/**
 * "İmlecin altında ne var" sorusunun TEK cevabı. Hem vurgu (hover) hem jest
 * sahipliği bunu okur — ikisi ayrı hesaplarsa vurgu "şunu tutarsın" der, basış
 * başka şeyi tutar (knowledge/gesture-bus-precedence.md).
 *
 * Sıra ekranda üstte durandan alta: köşe → sembol → alan nesnesi → açıklık →
 * duvar. Köşe tutamağı en üstte (HANDLE_ELEVATION_CM), nokta sembolü duvarın
 * ve açıklığın üstüne çiziliyor (RENDER_ORDER.pointSymbol), açıklık duvarın
 * üstüne boyanıyor (RENDER_ORDER.opening > wall), duvar en altta.
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

  // Sembol en son eklenenden geriye taranır: üst üste bırakılmış iki sembolde
  // üstte duran (sonra eklenen) tutulur. Konum duvara bağlıda duvardan türer.
  const symbol = [...context.symbols].reverse().find((candidate) => {
    if (!isSymbolOnFloor(candidate, context.floorId, context.walls)) return false
    const pose = getSymbolPose(candidate, context.walls, context.points)
    return (
      pose !== undefined &&
      isPointInSymbol(target, pose.position, context.toleranceCm, candidate.type)
    )
  })
  if (symbol) return { kind: 'symbol', symbolId: symbol.id }

  // Aynı gerekçe: son eklenen üstte duruyor sayılır.
  const areaObject = [...context.areaObjects]
    .reverse()
    .find(
      (candidate) => candidate.floorId === context.floorId && isPointInAreaObject(target, candidate),
    )
  if (areaObject) return { kind: 'area', areaObjectId: areaObject.id }

  // Kiriş alan nesnesinin ALTINDA, açıklığın ÜSTÜNDE: çizim sırası da öyle
  // (RENDER_ORDER.beam, opening ile pointSymbol arasında). Kiriş plan üstünde
  // duvarları KESEREK geçen bir taşıyıcı; altındaki duvar/açıklığa erişim
  // gerekirse kullanıcı kirişin dışına tıklar.
  const beam = findBeamUnderPoint(target, context.beams, context.floorId)
  if (beam) return { kind: 'beam', beamId: beam.id }

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
  if (a.kind === 'symbol' && b.kind === 'symbol') return a.symbolId === b.symbolId
  if (a.kind === 'area' && b.kind === 'area') return a.areaObjectId === b.areaObjectId
  if (a.kind === 'beam' && b.kind === 'beam') return a.beamId === b.beamId
  if (a.kind === 'opening' && b.kind === 'opening') return a.openingId === b.openingId
  if (a.kind === 'wall' && b.kind === 'wall') return a.wallId === b.wallId
  return false
}
