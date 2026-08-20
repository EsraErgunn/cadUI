import type { Id, Opening, Wall } from './model'
import { isWallOpenToOutside, type FloorRoom, type FloorRoomTopology } from './roomTopology'

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
 * Kapılardan geçilerek DIŞARIDAN ulaşılamayan mahaller (doküman Hata2).
 *
 * Kural "her mahalin bir kapısı olsun"dan daha güçlü okundu: kapısı yalnız
 * kapısız bir mahale açılan oda da erişilemez sayılır — "erişim sağlanmalıdır"
 * ifadesinin karşılığı bu. Normal bir dairede ikisi aynı sonucu verir, çünkü
 * giriş kapısı dış kabuktaki bir duvardadır.
 *
 * ⚠️ Kat, dışarıya açılan tek bir kapı bile taşımıyorsa bütün mahalleri
 * erişilemez çıkar. Merdiven boşluğunun ayrı çizilmediği kat planlarında bu
 * beklenen değil — analist onayına açık nokta.
 */
export function findRoomsWithoutDoorAccess(
  topology: FloorRoomTopology,
  walls: readonly Wall[],
  openings: readonly Opening[],
): FloorRoom[] {
  if (topology.rooms.length === 0) return []

  const doorWallIds = collectDoorWallIds(openings, walls, topology.floorId)

  const faceIndicesByWallId = new Map<Id, number[]>()
  topology.rooms.forEach((entry, index) => {
    for (const wallId of new Set(entry.face.wallIds)) {
      const bucket = faceIndicesByWallId.get(wallId)
      if (bucket) bucket.push(index)
      else faceIndicesByWallId.set(wallId, [index])
    }
  })

  // Dışarısı ayrı bir düğüm olarak modellenmiyor: dış kabuktaki kapılı
  // duvarların mahalleri doğrudan tohum, gerisi komşuluktan yayılıyor.
  const reachable = new Set<number>()
  const queue: number[] = []
  topology.rooms.forEach((entry, index) => {
    const hasDoorToOutside = [...new Set(entry.face.wallIds)].some(
      (wallId) => doorWallIds.has(wallId) && isWallOpenToOutside(topology, wallId),
    )
    if (!hasDoorToOutside) return

    reachable.add(index)
    queue.push(index)
  })

  while (queue.length > 0) {
    const index = queue.shift() as number
    for (const wallId of new Set(topology.rooms[index].face.wallIds)) {
      if (!doorWallIds.has(wallId)) continue

      for (const neighbour of faceIndicesByWallId.get(wallId) ?? []) {
        if (reachable.has(neighbour)) continue

        reachable.add(neighbour)
        queue.push(neighbour)
      }
    }
  }

  return topology.rooms.filter((_, index) => !reachable.has(index))
}
