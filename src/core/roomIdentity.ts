import type { Id, Room } from './model'
import type { RoomFace } from './room'

/**
 * Duvar kümesinin sıra bağımsız imzası. Yüz takibi çevrimi hangi köşeden
 * başlatırsa başlatsın aynı duvarları farklı sırayla verebilir; kimlik bu yüzden
 * sıraya değil KÜMEYE bakar.
 */
export function getWallSetKey(wallIds: readonly Id[]): string {
  return [...new Set(wallIds)].sort((left, right) => left - right).join(',')
}

export type RoomReconciliation = {
  /** Yeni oda listesi — hayatta kalanlar adıyla, yeni yüzler varsayılan adla. */
  rooms: Room[]
  /** Kimliği korunamayan, yani silinen odalar. Çağıran gerekirse haber verir. */
  removedRoomIds: Id[]
  /** Yeni kimlik alan yüz sayısı; çağıran bu kadar id ayırmalı. */
  createdCount: number
}

/**
 * Yüzleri mevcut odalarla eşleştirir.
 *
 * Kimlik kuralı önce TAM küme eşitliği, tutmazsa ÇİFT YÖNLÜ TAM KAPSAMA + TEK
 * aday: yüz odanın alt kümesi YA DA üst kümesiyse ve böyle tek bir oda varsa aynı
 * odadır. Taşıma, odanın sınırındaki duvar sayısını iki yönde de değiştirebiliyor
 * (K102/K103) ve kullanıcının verdiği ad, odaya hiç dokunulmamışken siliniyordu.
 *
 * Yaklaşık eşleşme (yüzde şu kadarı ortak) hâlâ YOK: uydurma bir eşik, sınır
 * durumlarda öngörülemez davranır. Kapsama ve teklik koşullarının ikisi de kesin.
 *
 * Duvar ikiye bölününce oda hayatta kalır çünkü bölme anında `Room.wallIds`
 * güncelleniyor (store/architectureSplit.ts) — burada küme zaten eşleşmiş olur.
 * Odanın içinden duvar geçince eski çevrim yüz olmaktan çıkar, iki yeni yüz
 * farklı kümelere sahiptir: ikisi de YENİ oda olur ve varsayılan adı alır.
 * Duvar silinip alan açılırsa yüz kaybolur, oda düşer.
 */
export function reconcileRooms(
  faces: readonly RoomFace[],
  existingRooms: readonly Room[],
  defaultName: string,
  takeId: () => Id,
): RoomReconciliation {
  const byWallSet = new Map<string, Room>()
  for (const room of existingRooms) {
    // Aynı imzadan iki oda olamaz; olduysa ilki kazanır, ikincisi zaten ölü kayıt.
    const key = getWallSetKey(room.wallIds)
    if (!byWallSet.has(key)) byWallSet.set(key, room)
  }

  const matchedRoomIds = new Set<Id>()
  const matchedByFace = new Map<number, Room>()

  // ÖNCE tam eşitlik, HEPSİ için: kesin eşleşen bir yüzün odasını, alt küme
  // araması sonradan çalıp başka yüze veremesin.
  faces.forEach((face, index) => {
    const existing = byWallSet.get(getWallSetKey(face.wallIds))
    if (!existing || matchedRoomIds.has(existing.id)) return

    matchedRoomIds.add(existing.id)
    matchedByFace.set(index, existing)
  })

  // SONRA kapsama, ÇİFT YÖNLÜ: yüz odanın alt kümesi ya da odanın üst kümesiyse
  // aynı odadır. Duvar taşımak odanın sınırındaki duvar SAYISINI iki yönde de
  // değiştirebiliyor (K102/K103):
  // - Kayıt yüzden GENİŞ kalır: bölünen duvarın iki parçası da kayda eklenir ama
  //   oda yalnız birini sınırında taşır.
  // - Yüz kayıttan GENİŞ olur: komşu odanın duvarı kopup bölününce artan parça
  //   bu odanın sınırına girer.
  //
  // Bu, K31'in reddettiği "yaklaşık eşleşme" DEĞİL: uydurma bir yüzde eşiği yok,
  // iki koşul da kesin — TAM kapsama (bir yönde) ve TEK aday. Birden çok oda
  // kapsıyorsa hangisi olduğu belirsizdir, eşleşme yapılmaz ve yüz yeni oda olur.
  //
  // Odanın içinden duvar geçme senaryosu (K31) bozulmaz: yeni yüzler o duvarı
  // içerir, eski kayıt içermez ve yüz eski kaydın tamamını da kapsamaz.
  const unmatchedRooms = existingRooms.filter((room) => !matchedRoomIds.has(room.id))
  faces.forEach((face, index) => {
    if (matchedByFace.has(index)) return

    const faceWallIds = [...new Set(face.wallIds)]
    const candidates = unmatchedRooms.filter((room) => {
      if (matchedRoomIds.has(room.id)) return false

      const roomWallIds = new Set(room.wallIds)
      const isFaceInsideRoom = faceWallIds.every((wallId) => roomWallIds.has(wallId))
      const isRoomInsideFace = [...roomWallIds].every((wallId) => faceWallIds.includes(wallId))
      return isFaceInsideRoom || isRoomInsideFace
    })
    if (candidates.length !== 1) return

    matchedRoomIds.add(candidates[0].id)
    matchedByFace.set(index, candidates[0])
  })

  const rooms: Room[] = []
  let createdCount = 0

  faces.forEach((face, index) => {
    const existing = matchedByFace.get(index)
    if (existing) {
      // Ad KORUNUR; wallIds yüzden tazelenir ki sıra ve olası tekrar temizlensin.
      rooms.push({ id: existing.id, wallIds: [...face.wallIds], name: existing.name })
      return
    }

    rooms.push({ id: takeId(), wallIds: [...face.wallIds], name: defaultName })
    createdCount += 1
  })

  const removedRoomIds = existingRooms
    .filter((room) => !matchedRoomIds.has(room.id))
    .map((room) => room.id)

  return { rooms, removedRoomIds, createdCount }
}

/**
 * Bölünen duvarın parçalarını, o duvarı sınırında sayan odaların çevrimine ekler.
 *
 * Bölme anında çağrılır. Yapılmazsa duvar ikiye ayrıldığı an odanın duvar kümesi
 * yüzünkiyle tutmaz, eşleşme kaçar ve kullanıcının verdiği ad kaybolur —
 * üstelik kullanıcı odaya hiç dokunmamışken.
 */
export function extendRoomsWithSplitPieces(
  rooms: readonly Room[],
  splitWallId: Id,
  pieceWallIds: readonly Id[],
): Room[] {
  return rooms.map((room) => {
    if (!room.wallIds.includes(splitWallId)) return room

    const missing = pieceWallIds.filter((pieceId) => !room.wallIds.includes(pieceId))
    if (missing.length === 0) return room

    return { ...room, wallIds: [...room.wallIds, ...missing] }
  })
}
