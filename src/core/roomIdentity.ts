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
 * Kimlik kuralı önce TAM küme eşitliği, tutmazsa TAM KAPSAMA + TEK aday: yüzün
 * duvarları bir odanınkinin alt kümesiyse ve böyle tek bir oda varsa aynı odadır
 * (K102 — kopma sonrası oda kaydı, bölünen duvarın iki parçasını birden içeriyor
 * ama oda artık yalnız birini sınırında taşıyor).
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

  // SONRA kapsama: yüzün duvarları odanınkinin ALT KÜMESİ ise aynı odadır.
  // Gerekçe K102: köşe kopunca komşu duvar bölünüyor ve odanın kaydı iki parçayı
  // birden içeriyor, oysa oda artık yalnız birini sınırında taşıyor. Tam eşitlik
  // tutmuyor ve kullanıcının verdiği ad, odaya hiç dokunulmamışken siliniyordu.
  //
  // Bu, K31'in reddettiği "yaklaşık eşleşme" DEĞİL: uydurma bir yüzde eşiği yok,
  // iki koşul da kesin — TAM kapsama ve TEK aday. Birden çok oda kapsıyorsa
  // hangisi olduğu belirsizdir, eşleşme yapılmaz ve yüz yeni oda olur.
  const unmatchedRooms = existingRooms.filter((room) => !matchedRoomIds.has(room.id))
  faces.forEach((face, index) => {
    if (matchedByFace.has(index)) return

    const faceWallIds = new Set(face.wallIds)
    const candidates = unmatchedRooms.filter(
      (room) =>
        !matchedRoomIds.has(room.id) &&
        [...faceWallIds].every((wallId) => room.wallIds.includes(wallId)),
    )
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
