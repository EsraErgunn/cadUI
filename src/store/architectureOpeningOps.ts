import type { ProjectData } from '../core/model'
import { isPlacementValid, pruneUnfittableOpenings, type OpeningPlacement } from '../core/opening'
import { getPlacementRange } from '../core/wall'

type ArchitectureData = Pick<ProjectData, 'points' | 'walls' | 'openings'>

/** Köşe payı burada hesaplanmaz; getPlacementRange'den geçirilir (K11). */
export function isPlacementValidInState(
  state: ArchitectureData,
  placement: OpeningPlacement,
): boolean {
  const wall = state.walls.find((candidate) => candidate.id === placement.wallId)
  if (!wall) return false

  const range = getPlacementRange(wall, state.points, state.walls)
  if (!range) return false

  return isPlacementValid(placement, range, state.openings)
}

/**
 * Duvarı silinen veya sığmayacak kadar kısalan açıklığı düşürür (K16).
 * Çağıranın set()'i içinde çalışır: silme + temizlik TEK geri alma adımı olsun.
 * Değişiklik olmadıysa false döner — duvar sürüklemesi her karede projeyi
 * kirletmesin.
 */
export function pruneOpeningsInDraft(draft: ArchitectureData): boolean {
  const kept = pruneUnfittableOpenings(draft.openings, draft.walls, draft.points)
  if (kept.length === draft.openings.length) return false

  draft.openings = kept
  return true
}
