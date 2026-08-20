import type { Id, Opening, Wall } from './model'
import type { FloorRoom, FloorRoomTopology } from './roomTopology'

function collectDoorWallIds(
  openings: readonly Opening[],
  walls: readonly Wall[],
  floorId: Id,
): Set<Id> {
  const wallFloorById = new Map<Id, Id>(walls.map((wall) => [wall.id, wall.floorId]))

  const doorWallIds = new Set<Id>()
  for (const opening of openings) {
    // Açıklık `floorId` TAŞIMAZ (K9), duvarından türetilir.
    if (opening.type !== 'door') continue
    if (wallFloorById.get(opening.wallId) !== floorId) continue
    doorWallIds.add(opening.wallId)
  }

  return doorWallIds
}

/**
 * Sınırında hiç kapı olmayan mahaller (doküman Hata2).
 *
 * Kural GEVŞEK okundu: "her mahalin en az bir kapısı olsun". Sıkı okuma
 * ("dışarıdan kapılarla ULAŞILABİLSİN", yani kapı grafında dış dünyaya bağlı
 * olsun) önce yazılmış, sonra KULLANICI KARARIYLA geri alındı — dışarıya açılan
 * kapısı çizilmemiş bir kat planında (merdiven boşluğu ayrı çizilmemişse)
 * bütün mahalleri hatalı gösteriyordu ve bu beklenen davranış değil.
 *
 * Fark yalnız uç durumda: kapısı yalnız kapısız bir mahale açılan oda burada
 * TEMİZ sayılır. Normal bir dairede iki okuma aynı sonucu verir.
 *
 * Bu yüzden dış/iç duvar ayrımına da gerek yok — `isWallOpenToOutside` artık
 * yalnız menfez kuralının işi (validateDischarge).
 */
export function findRoomsWithoutDoor(
  topology: FloorRoomTopology,
  walls: readonly Wall[],
  openings: readonly Opening[],
): FloorRoom[] {
  if (topology.rooms.length === 0) return []

  const doorWallIds = collectDoorWallIds(openings, walls, topology.floorId)

  return topology.rooms.filter(
    (entry) => !entry.face.wallIds.some((wallId) => doorWallIds.has(wallId)),
  )
}
