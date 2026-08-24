import type { PlanPoint } from './coords'
import type { Id, Point, Room, Wall } from './model'
import { findRoomFaces } from './room'
import { triangulatePolygon } from './roomFill'
import { getWallSetKey } from './roomIdentity'
import type { RoomUsageType } from './roomUsage'

/** Oda döşemesi: üçgenlenmiş poligon (her üç köşe bir üçgen) + taban kotu. */
export type SolidSlab = {
  key: string
  triangleCorners: PlanPoint[]
  baseCm: number
  /** Zemin rengi buradan geliyor; tanımsız mahal nötr renkte kalır (K117). */
  usageType: RoomUsageType | undefined
}

/**
 * Bir kattaki oda döşemeleri. Mahal KİMLİĞİ 2B'dekiyle aynı yoldan kuruluyor
 * (`getWallSetKey`): yüz takibi çevrimi hangi köşeden başlatırsa başlatsın
 * duvar kümesi aynı kalır, ikinci bir eşleştirme kuralı yazılmaz.
 */
export function buildLevelSlabs(
  walls: readonly Wall[],
  points: readonly Point[],
  rooms: readonly Room[],
  floorId: Id,
  baseCm: number,
): SolidSlab[] {
  const roomsByWallSet = new Map(rooms.map((room) => [getWallSetKey(room.wallIds), room]))

  return findRoomFaces(walls, points, floorId).map((face, index) => ({
    key: `${floorId}-slab-${index}`,
    triangleCorners: triangulatePolygon(face.corners),
    baseCm,
    usageType: roomsByWallSet.get(getWallSetKey(face.wallIds))?.usageType,
  }))
}
