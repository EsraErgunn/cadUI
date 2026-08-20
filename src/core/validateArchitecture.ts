import type { Floor, Id } from './model'
import { getBoundsAround } from './planBounds'
import { findRoomsWithoutDoorAccess } from './roomAccess'
import { getWallSetKey } from './roomIdentity'
import type { FloorRoom, FloorRoomTopology } from './roomTopology'
import { getRoomDisplayName } from './roomUsage'
import type { SelectionItem } from './selection'
import {
  VALIDATION_MESSAGES,
  type ValidationFocus,
  type ValidationIssue,
  type ValidationSource,
} from './validationModel'

/**
 * Hata satırındaki "Mahal: X". Etiketin ekranda YAZANIYLA aynı kural
 * (`getRoomDisplayName`): kullanıcı listede okuduğu adı planda arayacak, iki
 * yerde farklı metin görmemeli.
 */
export function getRoomName(entry: FloorRoom): string {
  return getRoomDisplayName(entry.room?.usageType)
}

/** Mahal kaydı yoksa (yüz henüz eşleşmemiş) duvar kümesi kimlik yerine geçer. */
export function getRoomKey(entry: FloorRoom): string {
  return entry.room ? String(entry.room.id) : `w${getWallSetKey(entry.face.wallIds)}`
}

/** Mahalin tamamı seçilir: sorunlu olan tek bir duvar değil mahalin kendisi. */
export function getRoomFocus(entry: FloorRoom): ValidationFocus | undefined {
  const bounds = getBoundsAround(entry.face.corners)
  if (!bounds) return undefined

  const selection: SelectionItem[] = [...new Set(entry.face.wallIds)].map((wallId) => ({
    kind: 'wall',
    id: wallId,
  }))
  return { view: 'architecture', selection, bounds }
}

/**
 * Katta çizilmiş bir mimari plan var mı (doküman Hata1, ilk yarısı)?
 *
 * Ölçü DUVAR: oda çevrimi duvarlardan türüyor, açıklık duvara bağlı, sembol de
 * çoğunlukla duvarda. Duvarsız ama içinde birkaç serbest sembol olan bir kat
 * "çizilmiş plan" sayılmaz — üstündeki mahal kurallarının hiçbiri bir şey
 * denetleyemezdi.
 */
export function hasArchitecturePlan(source: ValidationSource, floorId: Id): boolean {
  return source.walls.some((wall) => wall.floorId === floorId)
}

export function validateFloorArchitecture(
  source: ValidationSource,
  floor: Floor,
  topology: FloorRoomTopology,
): ValidationIssue[] {
  if (!hasArchitecturePlan(source, floor.id)) {
    return [
      {
        key: `architecturePlan:${floor.id}`,
        ruleId: 'architecturePlan',
        message: VALIDATION_MESSAGES.architecturePlan,
        location: { floorId: floor.id },
      },
    ]
  }

  return findRoomsWithoutDoorAccess(topology, source.walls, source.openings).map((entry) => ({
    key: `roomDoorAccess:${floor.id}:${getRoomKey(entry)}`,
    ruleId: 'roomDoorAccess' as const,
    message: VALIDATION_MESSAGES.roomDoorAccess,
    location: { floorId: floor.id, roomName: getRoomName(entry) },
    focus: getRoomFocus(entry),
  }))
}
