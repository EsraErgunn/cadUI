import type { PlanPoint } from './coords'
import type { Id, Point, Room, Wall } from './model'
import { findRoomFaces, type RoomFace } from './room'
import { getWallSetKey } from './roomIdentity'
import { isPointInsidePolygon } from './roomLabel'

/**
 * Bir mahal: geometrisi (yüz) + kullanıcının verdiği kaydı. Kayıt `undefined`
 * olabilir — duvar az önce değişmiş ve `recomputeRoomsInDraft` henüz o katı
 * taramamışsa yüz vardır ama eşleşen bir `Room` yoktur.
 */
export type FloorRoom = {
  face: RoomFace
  room: Room | undefined
}

export type FloorRoomTopology = {
  floorId: Id
  rooms: FloorRoom[]
  /**
   * Duvarın kaç mahali sınırladığı. İki mahal arasındaki duvar 2, binanın dış
   * kabuğundaki duvar 1 sayılır — `findRoomFaces` dış yüzü (negatif alanlı
   * sonsuz çevrim) zaten elediği için dışarısı hiçbir zaman bir yüz değildir.
   */
  faceCountByWallId: ReadonlyMap<Id, number>
}

/**
 * Kattaki mahallerin geometrisi + duvar-mahal komşuluğu. Hata kontrollerinin
 * dördü (kapı erişimi, cihazın mahal içinde olması, bacanın dışarı çıkması,
 * menfezin atmosfere açılması) aynı iki soruyu soruyor: "bu nokta hangi
 * mahalde" ve "bu duvarın öbür yüzü dışarısı mı". İkisi de yüz taramasından
 * türüyor, bu yüzden tarama kural başına tekrarlanmaz.
 *
 * Yüz ↔ kayıt eşleşmesi TAM KÜME eşitliğiyle (`Room.tsx` ile aynı kural):
 * `reconcileRooms`'un kapsama gevşetmesi burada tekrarlanmaz — o, kullanıcının
 * verdiği adı yaşatmak için var; burada eşleşmeyen yüz yine de bir mahaldir ve
 * varsayılan adla raporlanır.
 */
export function buildFloorRoomTopology(
  walls: readonly Wall[],
  points: readonly Point[],
  rooms: readonly Room[],
  floorId: Id,
): FloorRoomTopology {
  const faces = findRoomFaces(walls, points, floorId)

  const roomByWallSet = new Map<string, Room>()
  for (const room of rooms) {
    const key = getWallSetKey(room.wallIds)
    if (!roomByWallSet.has(key)) roomByWallSet.set(key, room)
  }

  const faceCountByWallId = new Map<Id, number>()
  for (const face of faces) {
    // Aynı duvar bir çevrimde iki kez geçebilir (çıkmaz uç); mahal sayısı
    // aranıyor, geçiş sayısı değil.
    for (const wallId of new Set(face.wallIds)) {
      faceCountByWallId.set(wallId, (faceCountByWallId.get(wallId) ?? 0) + 1)
    }
  }

  return {
    floorId,
    rooms: faces.map((face) => ({ face, room: roomByWallSet.get(getWallSetKey(face.wallIds)) })),
    faceCountByWallId,
  }
}

/**
 * Duvarın en az bir yüzü dışarıya bakıyor mu? Menfezin "atmosfere çıkması"
 * kuralının ölçüsü bu: iki mahali ayıran duvardaki menfez havayı yalnız öbür
 * odaya verir (doküman Hata10, iki görsel).
 */
export function isWallOpenToOutside(topology: FloorRoomTopology, wallId: Id): boolean {
  return (topology.faceCountByWallId.get(wallId) ?? 0) < 2
}

/**
 * Noktanın düştüğü mahal. İç içe çizilmiş mahallerde EN KÜÇÜĞÜ kazanır —
 * `findRoomFaceAt` ile aynı kural, tıklamayla doğrulamanın aynı mahali
 * göstermesi için.
 */
export function findFloorRoomAt(
  topology: FloorRoomTopology,
  target: PlanPoint,
): FloorRoom | undefined {
  let best: FloorRoom | undefined

  for (const entry of topology.rooms) {
    if (!isPointInsidePolygon(target, entry.face.corners)) continue
    if (!best || entry.face.areaCm2 < best.face.areaCm2) best = entry
  }

  return best
}
