import type { PlanPoint } from './coords'
import type { Id, Opening, Point, Wall } from './model'
import { getOpeningSpan } from './opening'
import {
  getSegmentLength,
  getWallEnds,
  MIN_WALL_LENGTH_CM,
  type MovedWallSegment,
} from './wall'

/** Kayan nokta payı: snap noktayı zaten doğrunun ÜSTÜNE koyuyor, eşik dar olmalı. */
const EPSILON_CM = 1e-6

/**
 * Duvarın üstünde düğüm oluşacak yer.
 *
 * `pointId` doluysa T birleşimidir: başka bir duvarın var olan köşesi bu duvarın
 * gövdesine denk geliyor, o köşe paylaşılır (yeni nokta üretilmez — aynı yerde
 * iki nokta duvarları kopuk gösterir ve mahal çevrimini kapatmaz).
 *
 * `crossingKey` doluysa kesişimdir: iki duvar birbirini kesiyor, ikisi de aynı
 * anahtarı taşır ki uygulayan taraf TEK Point üretsin.
 */
export type WallSplitPoint = {
  /** Duvarın p1 ucundan uzaklık (cm). */
  offsetCm: number
  position: PlanPoint
  pointId?: Id
  crossingKey?: string
}

type Segment = { p1: PlanPoint; p2: PlanPoint; lengthCm: number }

function readSegment(wall: Wall, points: readonly Point[]): Segment | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined

  const lengthCm = getSegmentLength(ends.p1, ends.p2)
  if (lengthCm < MIN_WALL_LENGTH_CM) return undefined

  return { p1: ends.p1, p2: ends.p2, lengthCm }
}

/**
 * Bölme uca bu kadar yakınsa yapılmaz. EPSILON yerine MIN_WALL_LENGTH kullanılır:
 * uca 0.5 cm kala bölmek, çizilemeyecek kadar kısa bir güdük duvar üretirdi.
 */
function isAtEnd(offsetCm: number, lengthCm: number): boolean {
  return offsetCm < MIN_WALL_LENGTH_CM || offsetCm > lengthCm - MIN_WALL_LENGTH_CM
}

/** Noktanın doğru parçası üzerindeki offset'i — parçanın DIŞINDAYSA undefined. */
function getOffsetOnSegment(segment: Segment, target: PlanPoint): number | undefined {
  const dx = segment.p2.x - segment.p1.x
  const dy = segment.p2.y - segment.p1.y
  const lengthSq = dx * dx + dy * dy

  const ratio = ((target.x - segment.p1.x) * dx + (target.y - segment.p1.y) * dy) / lengthSq
  const closest = { x: segment.p1.x + dx * ratio, y: segment.p1.y + dy * ratio }

  // Eksene dik uzaklık: nokta doğrunun üstünde değilse T birleşimi yok.
  if (getSegmentLength(closest, target) > EPSILON_CM) return undefined

  return ratio * segment.lengthCm
}

/** İki doğru parçasının İÇ kesişimi. Uçta buluşuyorlarsa undefined (düğüm zaten var). */
function getInteriorCrossing(a: Segment, b: Segment): { onA: number; onB: number } | undefined {
  const aDx = a.p2.x - a.p1.x
  const aDy = a.p2.y - a.p1.y
  const bDx = b.p2.x - b.p1.x
  const bDy = b.p2.y - b.p1.y

  const denominator = aDx * bDy - aDy * bDx
  // Paralel veya üst üste: tek bir kesişim noktası yok. Üst üste binen duvarlar
  // ayrı bir vaka — bkz. knowledge/wall-graph.md "bilinen sınır".
  if (Math.abs(denominator) < EPSILON_CM) return undefined

  const aRatio = ((b.p1.x - a.p1.x) * bDy - (b.p1.y - a.p1.y) * bDx) / denominator
  const bRatio = ((b.p1.x - a.p1.x) * aDy - (b.p1.y - a.p1.y) * aDx) / denominator
  if (aRatio < 0 || aRatio > 1 || bRatio < 0 || bRatio > 1) return undefined

  return { onA: aRatio * a.lengthCm, onB: bRatio * b.lengthCm }
}

function makeCrossingKey(firstWallId: Id, secondWallId: Id): string {
  // Sıra bağımsız: aynı çift her iki yönden de aynı anahtarı üretmeli.
  const [low, high] = firstWallId < secondWallId ? [firstWallId, secondWallId] : [secondWallId, firstWallId]
  return `${low}-${high}`
}

function pointAtOffset(segment: Segment, offsetCm: number): PlanPoint {
  const ratio = offsetCm / segment.lengthCm
  return {
    x: segment.p1.x + (segment.p2.x - segment.p1.x) * ratio,
    y: segment.p1.y + (segment.p2.y - segment.p1.y) * ratio,
  }
}

function addSplit(
  splits: Map<Id, WallSplitPoint[]>,
  wallId: Id,
  candidate: WallSplitPoint,
): void {
  const existing = splits.get(wallId) ?? []
  // Aynı yerde ikinci bir bölme üretme: aynı noktada iki duvar birden bitiyor olabilir.
  if (existing.some((split) => Math.abs(split.offsetCm - candidate.offsetCm) < EPSILON_CM)) return

  existing.push(candidate)
  splits.set(wallId, existing)
}

/**
 * Duvar grafını DÜZLEMSEL yapmak için gereken bölme noktaları.
 *
 * Mahal tespiti (core/room.ts) yüz taramasıyla çalışır ve bu ancak kenarların
 * yalnız düğümlerde buluştuğu bir grafta doğrudur. Kesişip geçen ya da bir
 * duvarın gövdesinde biten duvarlar bu koşulu bozar; burada nerede düğüm
 * açılacağı hesaplanır, uygulaması store tarafında (K24).
 *
 * İki vaka:
 * - **T birleşimi:** bir duvarın ucu, diğerinin gövdesine denk geliyor. O uçtaki
 *   var olan Point paylaşılır (`pointId`), yalnız gövdedeki duvar bölünür.
 * - **Kesişim:** iki duvar birbirini içeriden kesiyor. İkisi de bölünür ve
 *   ortak `crossingKey` ile TEK yeni Point üretilir.
 *
 * Uca MIN_WALL_LENGTH_CM'den yakın bölmeler atlanır: güdük duvar üretmenin
 * anlamı yok, o mesafe zaten gözle köşeden ayırt edilemez.
 *
 * Maliyet duvar sayısında karesel. Çizim ölçeğinde sorun değil; büyürse
 * rbush ile aday daraltma gerekir (geometry SKILL'i).
 */
export function findWallSplits(
  walls: readonly Wall[],
  points: readonly Point[],
  floorId: Id,
): Map<Id, WallSplitPoint[]> {
  const floorWalls = walls.filter((wall) => wall.floorId === floorId)
  const segments = new Map<Id, Segment>()
  for (const wall of floorWalls) {
    const segment = readSegment(wall, points)
    if (segment) segments.set(wall.id, segment)
  }

  const splits = new Map<Id, WallSplitPoint[]>()

  for (let index = 0; index < floorWalls.length; index += 1) {
    for (let other = index + 1; other < floorWalls.length; other += 1) {
      const wallA = floorWalls[index]
      const wallB = floorWalls[other]
      const segmentA = segments.get(wallA.id)
      const segmentB = segments.get(wallB.id)
      if (!segmentA || !segmentB) continue

      // T birleşimi: B'nin uçları A'nın gövdesinde mi (ve tersi)?
      const tJunctions: [Wall, Segment, Wall][] = [
        [wallA, segmentA, wallB],
        [wallB, segmentB, wallA],
      ]
      let isTJunction = false

      for (const [host, hostSegment, guest] of tJunctions) {
        for (const guestPointId of [guest.p1Id, guest.p2Id]) {
          // Ortak köşe zaten düğüm; bölmeye gerek yok.
          if (guestPointId === host.p1Id || guestPointId === host.p2Id) continue

          const guestPoint = points.find((candidate) => candidate.id === guestPointId)
          if (!guestPoint) continue

          const offsetCm = getOffsetOnSegment(hostSegment, guestPoint)
          if (offsetCm === undefined || isAtEnd(offsetCm, hostSegment.lengthCm)) continue

          addSplit(splits, host.id, {
            offsetCm,
            position: { x: guestPoint.x, y: guestPoint.y },
            pointId: guestPointId,
          })
          isTJunction = true
        }
      }

      // Uçları değen bir çift zaten bağlandı; ayrıca kesişim aramaya gerek yok.
      if (isTJunction) continue

      const crossing = getInteriorCrossing(segmentA, segmentB)
      if (!crossing) continue
      if (isAtEnd(crossing.onA, segmentA.lengthCm)) continue
      if (isAtEnd(crossing.onB, segmentB.lengthCm)) continue

      const crossingKey = makeCrossingKey(wallA.id, wallB.id)
      addSplit(splits, wallA.id, {
        offsetCm: crossing.onA,
        position: pointAtOffset(segmentA, crossing.onA),
        crossingKey,
      })
      addSplit(splits, wallB.id, {
        offsetCm: crossing.onB,
        position: pointAtOffset(segmentB, crossing.onB),
        crossingKey,
      })
    }
  }

  // Uygulayan taraf duvarı sırayla parçalayacak; offset'ler artan olmalı.
  for (const wallSplits of splits.values()) {
    wallSplits.sort((left, right) => left.offsetCm - right.offsetCm)
  }

  return splits
}

/**
 * Aday duvar segmenti bir açıklığın (kapı/pencere) İÇİNDEN geçiyorsa YA DA
 * onun içinde/üzerinde BAŞLIYOR/BİTİYORSA o açıklığı döner — yerleştirme buna
 * göre reddedilir. Fiziksel gerekçe: bir kapı/pencere boşluğunun ortasında
 * duvar ne başlayabilir ne durabilir ne de son bulabilir.
 *
 * Aday, açıklığı taşıyan duvarla KOLİNEER ise (aynı doğrultuda devam ediyorsa)
 * sorun sayılmaz: `getInteriorCrossing` paralel/üst üste durumda `undefined`
 * döner, bu fonksiyon o durumu otomatik atlar. Açıklık zaten o duvarın
 * ÜSTÜNDE bir delik (K9); aynı doğrultuda uzatma ona binmiyor, onu sürdürüyor.
 *
 * Adayın UCU duvara değmesi (T birleşimi) de REDDİN İÇİNDE — yalnız gerçek
 * bir çapraz geçiş değil, kesişim noktası açıklığın aralığındaysa uç-değme de
 * yasak. `getInteriorCrossing` uç değerlerini (0 veya 1) zaten kesişim
 * sayıyor, ekstra bir eleme gerekmiyor.
 *
 * ⚠️ Bu kontrol TEK YÖNLÜ: "aday segment, SABİT bir duvarın açıklığını kesiyor
 * mu". Taşıma senaryosunda ters yön de gerekiyor (taşınan duvarın KENDİ
 * açıklığı sabit bir duvarın üstüne gelebilir) — bkz.
 * `findBlockingOpeningOnMovedWalls`. İkisini birden isteyen çağıran
 * `findBlockingOpeningForMove` kullanır.
 */
export function findBlockingOpening(
  candidate: { p1: PlanPoint; p2: PlanPoint },
  walls: readonly Wall[],
  points: readonly Point[],
  openings: readonly Opening[],
  floorId: Id,
): Opening | undefined {
  const candidateLengthCm = getSegmentLength(candidate.p1, candidate.p2)
  if (candidateLengthCm < MIN_WALL_LENGTH_CM) return undefined
  const candidateSegment: Segment = { p1: candidate.p1, p2: candidate.p2, lengthCm: candidateLengthCm }

  for (const wall of walls) {
    if (wall.floorId !== floorId) continue

    const wallOpenings = openings.filter((opening) => opening.wallId === wall.id)
    if (wallOpenings.length === 0) continue

    const wallSegment = readSegment(wall, points)
    if (!wallSegment) continue

    // Kolineer veya kesişmiyor: undefined, bu duvar için sorun yok.
    const crossing = getInteriorCrossing(candidateSegment, wallSegment)
    if (!crossing) continue

    const blocking = wallOpenings.find((opening) => {
      const [startCm, endCm] = getOpeningSpan(opening)
      return crossing.onB > startCm && crossing.onB < endCm
    })
    if (blocking) return blocking
  }

  return undefined
}

/**
 * `findBlockingOpening`'in birden çok aday segment için toplu hâli — TAŞIMA
 * senaryosunda kullanılır: bir köşe veya duvar taşınınca ona bağlı BİRDEN
 * FAZLA duvar birden hareket eder (köşenin tüm komşuları, ya da katı ötelenen
 * duvarın kendisi), hepsi birlikte kontrol edilmeli. İlk bulunan engel döner.
 */
export function findBlockingOpeningInSegments(
  segments: readonly { p1: PlanPoint; p2: PlanPoint }[],
  walls: readonly Wall[],
  points: readonly Point[],
  openings: readonly Opening[],
  floorId: Id,
): Opening | undefined {
  for (const segment of segments) {
    const blocking = findBlockingOpening(segment, walls, points, openings, floorId)
    if (blocking) return blocking
  }

  return undefined
}

/**
 * `findBlockingOpening`'in TERS yönü: TAŞINAN duvarın KENDİ açıklığı, sabit bir
 * duvarın gövdesinin üstüne mi geliyor?
 *
 * Bu kontrol eksikti ve hata sessizdi (K48): kapısı olan bir duvarı sürükleyip
 * kapıyı başka bir duvarın üstüne bindirmek engellenmiyordu. Diğer yön
 * (`findBlockingOpeningInSegments`) yalnız "hareket eden segment, SABİT bir
 * açıklığı kesiyor mu" diye soruyor — taşınan duvarın açıklığını hiç görmüyor,
 * çünkü o duvar `stationaryWalls` listesinden zaten çıkarılmış.
 *
 * Fiziksel gerekçe K35/K36'nın aynısı, yalnız rolleri değişmiş: bir kapı
 * boşluğunun ortasında duvar duramaz — duvarın mı kapıya, kapının mı duvara
 * getirildiği fark etmez.
 *
 * Segmentin uçları duvarın `p1 → p2` sırasında gelmek zorunda (`MovedWallSegment`
 * bunu şart koşuyor): açıklığın aralığı p1 ucundan ölçülüyor.
 */
export function findBlockingOpeningOnMovedWalls(
  movedSegments: readonly MovedWallSegment[],
  stationaryWalls: readonly Wall[],
  points: readonly Point[],
  openings: readonly Opening[],
  floorId: Id,
): Opening | undefined {
  for (const moved of movedSegments) {
    const movedOpenings = openings.filter((opening) => opening.wallId === moved.wallId)
    if (movedOpenings.length === 0) continue

    const lengthCm = getSegmentLength(moved.p1, moved.p2)
    if (lengthCm < MIN_WALL_LENGTH_CM) continue
    const movedSegment: Segment = { p1: moved.p1, p2: moved.p2, lengthCm }

    for (const wall of stationaryWalls) {
      if (wall.floorId !== floorId) continue

      const wallSegment = readSegment(wall, points)
      if (!wallSegment) continue

      // Roller ters: aday SABİT duvar, açıklığı taşıyan (B) ise TAŞINAN duvar.
      const crossing = getInteriorCrossing(wallSegment, movedSegment)
      if (!crossing) continue

      const blocking = movedOpenings.find((opening) => {
        const [startCm, endCm] = getOpeningSpan(opening)
        return crossing.onB > startCm && crossing.onB < endCm
      })
      if (blocking) return blocking
    }
  }

  return undefined
}

/**
 * Taşımanın açıklık kontrolünün TEK kapısı: iki yönü birden sorar. Çağıranlar
 * bunu kullanır ki biri ters yönü yazmayı unutamasın — hata sessiz olurdu
 * (kullanıcı kapıyı duvarın içine gömer, hiçbir uyarı çıkmaz).
 */
export function findBlockingOpeningForMove(
  movedSegments: readonly MovedWallSegment[],
  stationaryWalls: readonly Wall[],
  points: readonly Point[],
  openings: readonly Opening[],
  floorId: Id,
): Opening | undefined {
  return (
    findBlockingOpeningInSegments(movedSegments, stationaryWalls, points, openings, floorId) ??
    findBlockingOpeningOnMovedWalls(movedSegments, stationaryWalls, points, openings, floorId)
  )
}
