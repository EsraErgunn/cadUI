import type { FloorContentSource } from './floorContent'
import { getFloorElevationsCm } from './floorElevation'
import type { Floor, Id } from './model'
import { isSymbolOnFloor } from './symbolPlacement'

/**
 * Rozet için hattın yalnız katı yetiyordu; döküm için KENAR sayısı da gerekiyor.
 * FloorContentSource'a eklenmedi: orası "bu katta tesisat var mı" sorusunu
 * cevaplıyor ve segment bilmesine gerek yok. `Omit` şart — kesişim iki dizi
 * tipini birleştirir, alanı GEÇERSİZ KILMAZ.
 */
export type FloorDeletionSource = Omit<FloorContentSource, 'installationLines'> & {
  installationLines: readonly { floorId: Id; segments: readonly unknown[] }[]
}

/**
 * Silinecek katlardaki çizimin dökümü (madde 14). Sayılar TÜRE göre ayrılmış:
 * "37 öge silinecek" kullanıcıya neyi kaybettiğini söylemez, "14 duvar · 6 kapı"
 * söyler.
 */
export type FloorDeletionCounts = {
  wallCount: number
  roomCount: number
  doorCount: number
  windowCount: number
  symbolCount: number
  pipeSegmentCount: number
  installationElementCount: number
}

/** Silme sonrası kotu değişen kat (madde 14: "önceden gösterilecektir"). */
export type FloorElevationChange = {
  floorId: Id
  name: string
  beforeCm: number
  afterCm: number
}

export type FloorDeletionSummary = {
  floors: Floor[]
  counts: FloorDeletionCounts
  elevationChanges: FloorElevationChange[]
  /** Seçim projedeki katların TAMAMINI kapsıyorsa silme yapılamaz (madde 14). */
  isBlocked: boolean
}

const EMPTY_COUNTS: FloorDeletionCounts = {
  wallCount: 0,
  roomCount: 0,
  doorCount: 0,
  windowCount: 0,
  symbolCount: 0,
  pipeSegmentCount: 0,
  installationElementCount: 0,
}

export function isDeletionEmpty(counts: FloorDeletionCounts): boolean {
  return Object.values(counts).every((count) => count === 0)
}

function countFloorContent(
  source: FloorDeletionSource,
  floorIds: ReadonlySet<Id>,
): FloorDeletionCounts {
  const walls = source.walls.filter((wall) => floorIds.has(wall.floorId))
  const wallIds = new Set(walls.map((wall) => wall.id))

  // Açıklık ve oda kat TAŞIMAZ; ikisi de duvarından türetiliyor (K9, K31) —
  // kat silme temizliğiyle AYNI ölçüt, yoksa gösterilen sayı silinenden şaşar.
  const openings = source.openings.filter((opening) => wallIds.has(opening.wallId))
  const lines = source.installationLines.filter((line) => floorIds.has(line.floorId))

  return {
    wallCount: walls.length,
    roomCount: source.rooms.filter((room) => room.wallIds.some((id) => wallIds.has(id))).length,
    doorCount: openings.filter((opening) => opening.type === 'door').length,
    windowCount: openings.filter((opening) => opening.type === 'window').length,
    symbolCount: source.symbols.filter((symbol) =>
      [...floorIds].some((floorId) => isSymbolOnFloor(symbol, floorId, source.walls)),
    ).length,
    // Boru "bölümü" hat değil SEGMENT: kullanıcı kırıklı bir hattı tek boru
    // saymıyor, her kenarı ayrı bir parça olarak görüyor.
    pipeSegmentCount: lines.reduce((total, line) => total + line.segments.length, 0),
    installationElementCount: source.installationElements.filter((element) =>
      floorIds.has(element.floorId),
    ).length,
  }
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
  source: FloorDeletionSource,
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
    counts: isBlocked ? EMPTY_COUNTS : countFloorContent(source, removedIds),
    elevationChanges: isBlocked ? [] : getElevationChanges(floors, removedIds),
    isBlocked,
  }
}
