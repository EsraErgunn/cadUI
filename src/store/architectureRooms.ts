// cadStore ↔ store dosyaları karşılıklı import eder; bu taraf tip-only (K17).
import type { CadState } from './cadStore'
import { toPlainSnapshot } from './draftSnapshot'
import { takeNextId } from './projectMeta'
import type { Id, Room } from '../core/model'
import { findRoomFaces } from '../core/room'
import { getWallSetKey, reconcileRooms } from '../core/roomIdentity'
import type { RoomUsageType } from '../core/roomUsage'

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
  const { rooms, removedRoomIds, createdCount } = reconcileRooms(faces, floorRooms, () =>
    takeNextId(draft),
  )

  // Hiçbir şey değişmediyse diziye DOKUNMA: yeni referans, geçmişe boş bir adım
  // ve gereksiz render demek (areProjectStatesEqual sığ karşılaştırma yapıyor).
  //
  // ⚠️ Kimlik yetmez, DUVAR KÜMESİ de karşılaştırılmalı. Duvar bölününce
  // `extendRoomsWithSplitPieces` her iki parçayı da odanın kaydına ekliyor; oda
  // parçalardan yalnız birini sınırında taşıyorsa kayıt yüzün ÜST KÜMESİ olur.
  // Sayı ve sıra değişmediği için buradan yazmadan çıkılıyor, bayat kayıt
  // kalıyordu — ve `Room.tsx` yüzü odayla TAM KÜME eşitliğiyle eşleştirdiği için
  // o oda hiç çizilmiyordu: dolgusu ve etiketi kayboluyordu (kullanıcı bildirimi).
  if (removedRoomIds.length === 0 && createdCount === 0 && rooms.length === floorRooms.length) {
    const isUnchanged = rooms.every(
      (room, index) =>
        floorRooms[index]?.id === room.id &&
        getWallSetKey(floorRooms[index].wallIds) === getWallSetKey(room.wallIds),
    )
    if (isUnchanged) return false
  }

  draft.rooms = [...otherFloorRooms, ...rooms]
  return true
}


/**
 * Kullanım tipini yazar. `undefined` alanı SİLER (boş bir değere ayarlamaz):
 * modelde alanın yokluğu "tip belirtilmemiş" demek ve `toRoomJson` da alanı
 * dosyaya hiç yazmıyor — iki taraf aynı şeyi söylemeli.
 */
export function setRoomUsageTypeInDraft(
  draft: CadState,
  roomId: Id,
  usageType: RoomUsageType | undefined,
): boolean {
  const room = draft.rooms.find((candidate) => candidate.id === roomId)
  if (!room || room.usageType === usageType) return false

  if (usageType === undefined) delete room.usageType
  else room.usageType = usageType
  return true
}
