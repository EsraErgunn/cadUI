import type { ArchitectureSlice } from './architectureSlice'
import type { PlanPoint } from '../core/coords'
import type { Id, Opening, Point, Wall } from '../core/model'
import { getOccupiedRanges, getOpeningsOnWall, type OpeningSpan } from '../core/opening'
import {
  getPlacementRange,
  getSnapPoints,
  getWallsAtPoint,
  type PlacementRange,
} from '../core/wall'

/**
 * Duvar ↔ açıklık sözleşmesinin store yüzü — bkz. knowledge/snap-contract.md.
 *
 * ⚠️ Aşağıdakilerin bir kısmı her çağrıda YENİ dizi/nesne üretir
 * (selectPointsOnFloor, selectWallsOnFloor, selectWallsAtPoint,
 * selectWallSnapPoints, selectWallPlacementRange, selectOpeningsOnWall,
 * selectOccupiedRanges). `useCadStore((s) => selectX(s, id))` biçiminde
 * kullanılırsa Object.is her seferinde false döner ve bileşen sonsuz yeniden
 * render olur. Bunlar action/olay içinden `useCadStore.getState()` ile çağrılan
 * SORGU YARDIMCILARIDIR; bileşenler kararlı `state.walls` / `state.openings`
 * referanslarına abone olup türetir.
 * (selectPointById/selectWallById/selectOpeningById `find` kullandığı için
 * dizideki nesnenin kendisini döndürür — onlar abonelik olarak güvenli.)
 */

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

export function selectOpeningById(state: ArchitectureSlice, openingId: Id): Opening | undefined {
  return state.openings.find((opening) => opening.id === openingId)
}

export function selectOpeningsOnWall(state: ArchitectureSlice, wallId: Id): Opening[] {
  return getOpeningsOnWall(wallId, state.openings)
}

/** B→A sözleşmesi: duvarı açıklığın üstünden geçirmemek için okunur. */
export function selectOccupiedRanges(state: ArchitectureSlice, wallId: Id): OpeningSpan[] {
  return getOccupiedRanges(wallId, state.openings)
}
