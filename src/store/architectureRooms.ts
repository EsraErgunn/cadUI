// cadStore ↔ store dosyaları karşılıklı import eder; bu taraf tip-only (K17).
import type { CadState } from './cadStore'
import { toPlainSnapshot } from './draftSnapshot'
import { takeNextId } from './projectMeta'
import { DEFAULT_ROOM_NAME, type Id, type Room } from '../core/model'
import { findRoomFaces } from '../core/room'
import { reconcileRooms } from '../core/roomIdentity'

/**
 * Oda AKTİF KATA aittir ama `Room.floorId` yoktur — kat, çevrimindeki duvarlardan
 * türetilir (K9 deseni). Yeniden hesaplama yalnız aktif katı ilgilendirdiği için
 * öbür katların odaları olduğu gibi korunmalı; `draft.rooms`'u toptan
 * değiştirmek onları sessizce silerdi.
 */
function isRoomOnFloor(room: Room, wallIdsOnFloor: ReadonlySet<Id>): boolean {
  return room.wallIds.some((wallId) => wallIdsOnFloor.has(wallId))
}

/**
 * Kapalı alanları yeniden bulur ve mevcut odalarla eşleştirir (K31).
 *
 * Çağıranın `set()`'i İÇİNDE çalışır: oda değişimi, onu tetikleyen duvar
 * düzenlemesiyle TEK geri alma adımı olsun. Kullanıcının verdiği ad duvar
 * bölünse de yaşar; odanın içinden duvar geçerse eski oda düşer ve yerine iki
 * yeni oda varsayılan adla doğar.
 *
 * Değişiklik yoksa false döner — sürükleme her karede projeyi kirletmesin.
 */
export function recomputeRoomsInDraft(draft: CadState): boolean {
  const wallIdsOnFloor = new Set<Id>(
    draft.walls.filter((wall) => wall.floorId === draft.activeFloorId).map((wall) => wall.id),
  )

  const otherFloorRooms = draft.rooms.filter((room) => !isRoomOnFloor(room, wallIdsOnFloor))
  const floorRooms = draft.rooms.filter((room) => isRoomOnFloor(room, wallIdsOnFloor))

  // Yüz taraması graf gezintisi: kavşak kurup her kavşakta açı sıralıyor, yani
  // duvar/nokta özelliklerini defalarca okuyor — draft'ta her okuma proxy'den
  // geçerdi (bkz. draftSnapshot.ts).
  const faces = findRoomFaces(
    toPlainSnapshot(draft.walls),
    toPlainSnapshot(draft.points),
    draft.activeFloorId,
  )
  const { rooms, removedRoomIds, createdCount } = reconcileRooms(
    faces,
    floorRooms,
    DEFAULT_ROOM_NAME,
    () => takeNextId(draft),
  )

  // Hiçbir şey değişmediyse diziye DOKUNMA: yeni referans, geçmişe boş bir adım
  // ve gereksiz render demek (areProjectStatesEqual sığ karşılaştırma yapıyor).
  if (removedRoomIds.length === 0 && createdCount === 0) {
    const isSameOrder = rooms.every((room, index) => floorRooms[index]?.id === room.id)
    if (isSameOrder && rooms.length === floorRooms.length) return false
  }

  draft.rooms = [...otherFloorRooms, ...rooms]
  return true
}

/**
 * Odayı yeniden adlandırır; yazıldıysa true.
 *
 * Boş ad REDDEDİLİR ve varsayılana da düşürülmez (K13 deseni): kullanıcı adı
 * silip yanlışlıkla onaylarsa "Salon" sessizce kaybolmasın. Ad değişmediyse de
 * yazılmaz — aynı değeri koymak geçmişe boş bir Ctrl+Z adımı eklerdi.
 */
export function renameRoomInDraft(draft: CadState, roomId: Id, name: string): boolean {
  const room = draft.rooms.find((candidate) => candidate.id === roomId)
  if (!room) return false

  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed === room.name) return false

  room.name = trimmed
  return true
}
