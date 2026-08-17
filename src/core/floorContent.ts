import type { FloorCloneSource } from './floorClone'
import type { Id } from './model'
import { isSymbolOnFloor } from './symbolPlacement'

/**
 * Bir katta hangi tür çizim var (madde 7). İki tür AYRI tutulur çünkü rozetler
 * ayrı gösteriliyor ve kat kopyalama ikisini ayrı ayrı seçtiriyor (madde 16).
 */
export type FloorContent = {
  hasArchitecture: boolean
  hasInstallation: boolean
}

/** Düşey eksende süren alan nesnesi var mı (KK-13 uyarısı). */
export function getVerticalAxisCount(counts: FloorContentCounts): number {
  return counts.flueShaftCount + counts.columnVentilationCount
}

export type FloorContentSource = FloorCloneSource & {
  installationElements: readonly { floorId: Id }[]
  installationLines: readonly { floorId: Id; segments: readonly unknown[] }[]
}

/**
 * Kattaki çizimin TÜR BAZLI dökümü. "37 öge" kullanıcıya neyi kaybettiğini ya da
 * neyi kopyalayacağını söylemez, "14 duvar · 6 kapı" söyler. Silme onayı ve
 * kopyalama penceresi aynı sayımı kullanır — iki ayrı sayaç zamanla ayrışırdı.
 */
export type FloorContentCounts = {
  wallCount: number
  roomCount: number
  doorCount: number
  windowCount: number
  symbolCount: number
  areaObjectCount: number
  beamCount: number
  textCount: number
  /** Düşey eksende süren alan nesneleri — silme uyarısı bunlara bakar (KK-13). */
  flueShaftCount: number
  columnVentilationCount: number
  pipeSegmentCount: number
  installationElementCount: number
}

export const EMPTY_FLOOR_CONTENT_COUNTS: FloorContentCounts = {
  wallCount: 0,
  roomCount: 0,
  doorCount: 0,
  windowCount: 0,
  symbolCount: 0,
  areaObjectCount: 0,
  beamCount: 0,
  textCount: 0,
  flueShaftCount: 0,
  columnVentilationCount: 0,
  pipeSegmentCount: 0,
  installationElementCount: 0,
}

export function isContentCountEmpty(counts: FloorContentCounts): boolean {
  return Object.values(counts).every((count) => count === 0)
}

export function getFloorContentCounts(
  source: FloorContentSource,
  floorIds: ReadonlySet<Id>,
): FloorContentCounts {
  const walls = source.walls.filter((wall) => floorIds.has(wall.floorId))
  const wallIds = new Set(walls.map((wall) => wall.id))

  // Açıklık ve oda kat TAŞIMAZ; ikisi de duvarından türetiliyor (K9, K31) —
  // kat silme temizliğiyle AYNI ölçüt, yoksa gösterilen sayı silinenden şaşar.
  const openings = source.openings.filter((opening) => wallIds.has(opening.wallId))
  const areaObjects = source.areaObjects.filter((areaObject) => floorIds.has(areaObject.floorId))
  const lines = source.installationLines.filter((line) => floorIds.has(line.floorId))

  return {
    wallCount: walls.length,
    roomCount: source.rooms.filter((room) => room.wallIds.some((id) => wallIds.has(id))).length,
    doorCount: openings.filter((opening) => opening.type === 'door').length,
    windowCount: openings.filter((opening) => opening.type === 'window').length,
    symbolCount: source.symbols.filter((symbol) =>
      [...floorIds].some((floorId) => isSymbolOnFloor(symbol, floorId, source.walls)),
    ).length,
    areaObjectCount: areaObjects.length,
    beamCount: source.beams.filter((beam) => floorIds.has(beam.floorId)).length,
    textCount: source.texts.filter((text) => floorIds.has(text.floorId)).length,
    // Baca şaftı ve kolon havalandırması düşey eksende sürer; katı silinince
    // alt/üst kattaki karşılıkları aynı eksende kalmaz (KK-13). İki tür AYRI
    // sayılıyor çünkü uyarı ikisini adıyla söylüyor.
    flueShaftCount: areaObjects.filter((areaObject) => areaObject.type === 'flueShaft').length,
    columnVentilationCount: areaObjects.filter(
      (areaObject) => areaObject.type === 'columnVentilation',
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
 * Rozet kat verisinden ANLIK üretilir (madde 7), saklanmaz: kaydedilen bir
 * "doluluk" alanı çizim değiştikçe ayrışır ve kullanıcı boş bir katı dolu
 * görürdü.
 */
export function getFloorContent(source: FloorContentSource, floorId: Id): FloorContent {
  return {
    // Nokta havuzu duvarın kendisinden önce dolar: yalnız duvara bakmak, henüz
    // kapanmamış bir çizimi "boş" gösterirdi. Sembol duvara bağlıysa katını
    // duvarından alır, bu yüzden duvar listesi de veriliyor.
    hasArchitecture:
      source.points.some((point) => point.floorId === floorId) ||
      source.walls.some((wall) => wall.floorId === floorId) ||
      source.symbols.some((symbol) => isSymbolOnFloor(symbol, floorId, source.walls)) ||
      // Alan nesnesi (merdiven/kolon/baca şaftı) mimarinin parçası: duvarı
      // olmayan ama merdiveni olan kat "boş" gösterilmemeli.
      source.areaObjects.some((areaObject) => areaObject.floorId === floorId) ||
      source.beams.some((beam) => beam.floorId === floorId) ||
      // Metin de mimarinin parçası: yalnız not düşülmüş bir kat "boş" değildir.
      source.texts.some((text) => text.floorId === floorId),
    hasInstallation:
      source.installationElements.some((element) => element.floorId === floorId) ||
      source.installationLines.some((line) => line.floorId === floorId),
  }
}

export function isFloorContentEmpty(content: FloorContent): boolean {
  return !content.hasArchitecture && !content.hasInstallation
}
