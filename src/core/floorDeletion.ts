import {
  EMPTY_FLOOR_CONTENT_COUNTS,
  getFloorContentCounts,
  type FloorContentCounts,
  type FloorContentSource,
} from './floorContent'
import { getFloorElevationsCm } from './floorElevation'
import type { Floor, Id } from './model'

/** Silme sonrası kotu değişen kat (madde 14: "önceden gösterilecektir"). */
export type FloorElevationChange = {
  floorId: Id
  name: string
  beforeCm: number
  afterCm: number
}

export type FloorDeletionSummary = {
  floors: Floor[]
  counts: FloorContentCounts
  elevationChanges: FloorElevationChange[]
  /** Seçim projedeki katların TAMAMINI kapsıyorsa silme yapılamaz (madde 14). */
  isBlocked: boolean
}

/**
 * Kotu değişen katlar. Kot saklanmadığı için "önce/sonra" ancak iki kez
 * hesaplanarak bulunur — silinen katın yüksekliği kadar düşen katları tek tek
 * bilmek, tek bir "X m iner" cümlesinden daha doğru: birden çok kat farklı
 * seviyelerden silinince düşüş miktarı katlara göre DEĞİŞİR.
 */
function getElevationChanges(
  floors: readonly Floor[],
  removedIds: ReadonlySet<Id>,
): FloorElevationChange[] {
  const before = getFloorElevationsCm(floors)
  const remaining = floors.filter((floor) => !removedIds.has(floor.id))
  const after = getFloorElevationsCm(remaining)

  const changes: FloorElevationChange[] = []
  remaining.forEach((floor, index) => {
    const beforeCm = before[floors.findIndex((candidate) => candidate.id === floor.id)]
    if (beforeCm === after[index]) return
    changes.push({ floorId: floor.id, name: floor.name, beforeCm, afterCm: after[index] })
  })
  return changes
}

export function getFloorDeletionSummary(
  source: FloorContentSource,
  floors: readonly Floor[],
  floorIds: readonly Id[],
): FloorDeletionSummary {
  const removedIds = new Set(floorIds.filter((id) => floors.some((floor) => floor.id === id)))
  const removed = floors.filter((floor) => removedIds.has(floor.id))
  const isBlocked = removed.length > 0 && removed.length === floors.length

  return {
    floors: removed,
    // Engellenen silmede döküm ÜRETİLMEZ: silinmeyecek bir içeriğin sayısını
    // göstermek kullanıcıya olmayacak bir kaybı okutur.
    counts: isBlocked ? EMPTY_FLOOR_CONTENT_COUNTS : getFloorContentCounts(source, removedIds),
    elevationChanges: isBlocked ? [] : getElevationChanges(floors, removedIds),
    isBlocked,
  }
}
