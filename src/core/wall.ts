import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'

/** Bu farkın altındaki uzunluklar sıfır sayılır (kayan nokta karşılaştırması). */
const EPSILON_CM = 1e-6

const DEG_PER_RAD = 180 / Math.PI

export const DEFAULT_WALL_THICKNESS_CM = 20
export const DEFAULT_WALL_HEIGHT_CM = 280

/** Bundan kısa duvar kazara çift tıklamayla oluşan sıfır boy segmenttir, kabul edilmez. */
export const MIN_WALL_LENGTH_CM = 1

export type WallEnds = { p1: PlanPoint; p2: PlanPoint }

export type WallProjection = {
  /** Hedefin duvar ekseni üzerindeki izdüşümü. */
  point: PlanPoint
  /** p1 ucundan itibaren uzaklık (cm). Segment dışına taşmaz. */
  offsetCm: number
  /** Hedefin duvar eksenine dik uzaklığı (cm). */
  distanceCm: number
}

/** Açıklığın ORTASININ durabileceği offset aralığı — bkz. knowledge/opening-placement.md. */
export type PlacementRange = {
  minOffsetCm: number
  maxOffsetCm: number
}

/** Nokta havuzunun id → Point indeksi. */
export type PointIndex = ReadonlyMap<Id, Point>

/**
 * Havuzu id'ye göre indeksler.
 *
 * Neden gerekti: `points.find()` O(P) tarama yapıyor ve sıcak yollarda duvar
 * ÇİFTİ başına çağrılıyordu (`getSnapPoints` iç içe iki duvar döngüsü,
 * `findWallSplits` aynısı) — toplam O(N²·P). 40 duvar / 60 noktalık planda tek
 * fare hareketinde ~190 bin dizi adımı ediyordu.
 *
 * İndeks ÇAĞRI BAŞINA kurulur, modül seviyesinde önbelleklenmez: immer draft'ı
 * bir dizidir ve üretici içinde YERİNDE değişir (`draft.points.push(...)`),
 * yani dizi referansı aynı kalırken içerik değişebilir. Referansa göre
 * önbelleklenen bir indeks o anda bayatlar ve yeni eklenen nokta `undefined`
 * döner — duvar bölme tam olarak bu yüzden kırılmıştı.
 */
export function buildPointIndex(points: readonly Point[]): PointIndex {
  const index = new Map<Id, Point>()
  for (const point of points) index.set(point.id, point)
  return index
}

function findPoint(points: readonly Point[], pointId: Id): Point | undefined {
  return points.find((point) => point.id === pointId)
}

function isSamePlanPoint(a: PlanPoint, b: PlanPoint): boolean {
  return Math.abs(a.x - b.x) < EPSILON_CM && Math.abs(a.y - b.y) < EPSILON_CM
}

export function getSegmentLength(a: PlanPoint, b: PlanPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function getSegmentMidpoint(a: PlanPoint, b: PlanPoint): PlanPoint {
  return { x: normalizeZero((a.x + b.x) / 2), y: normalizeZero((a.y + b.y) / 2) }
}

export function getSegmentAngleDeg(a: PlanPoint, b: PlanPoint): number {
  return normalizeZero(Math.atan2(b.y - a.y, b.x - a.x) * DEG_PER_RAD)
}

/** Duvar koordinatını taşımaz, ortak havuza referans verir; uçları burada çözülür. */
export function getWallEnds(wall: Wall, points: readonly Point[]): WallEnds | undefined {
  const p1 = findPoint(points, wall.p1Id)
  const p2 = findPoint(points, wall.p2Id)
  if (!p1 || !p2) return undefined
  return { p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y } }
}

/** `getWallEnds`'in indeksli hâli; duvar döngüsü içinde çağrılan yerler bunu kullanır. */
export function getWallEndsFrom(wall: Wall, pointIndex: PointIndex): WallEnds | undefined {
  const p1 = pointIndex.get(wall.p1Id)
  const p2 = pointIndex.get(wall.p2Id)
  if (!p1 || !p2) return undefined
  return { p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y } }
}

export function projectOntoSegment(
  a: PlanPoint,
  b: PlanPoint,
  target: PlanPoint,
): WallProjection {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSqCm = dx * dx + dy * dy

  // İki ucu çakışık duvar: yön tanımsız, izdüşüm p1'in kendisidir.
  if (lengthSqCm < EPSILON_CM) {
    return { point: { ...a }, offsetCm: 0, distanceCm: getSegmentLength(a, target) }
  }

  const rawRatio = ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSqCm
  // Uçların dışına taşan izdüşüm duvarın üzerinde değildir; uca sabitlenir.
  const ratio = Math.min(1, Math.max(0, rawRatio))
  const point = {
    x: normalizeZero(a.x + dx * ratio),
    y: normalizeZero(a.y + dy * ratio),
  }

  return {
    point,
    offsetCm: Math.sqrt(lengthSqCm) * ratio,
    distanceCm: getSegmentLength(point, target),
  }
}

export function projectPointOntoWall(
  wall: Wall,
  points: readonly Point[],
  target: PlanPoint,
): WallProjection | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined
  return projectOntoSegment(ends.p1, ends.p2, target)
}

/** Bir köşede birleşen duvarlar. Köşe taşıma ve köşe payı hesabı bunu kullanır. */
export function getWallsAtPoint(pointId: Id, walls: readonly Wall[]): Wall[] {
  return walls.filter((wall) => wall.p1Id === pointId || wall.p2Id === pointId)
}

/** Hiçbir duvarın kullanmadığı noktalar. Silme sonrası temizlenmezse JSON şişer. */
export function getOrphanPointIds(points: readonly Point[], walls: readonly Wall[]): Id[] {
  const usedIds = new Set<Id>()
  for (const wall of walls) {
    usedIds.add(wall.p1Id)
    usedIds.add(wall.p2Id)
  }
  return points.filter((point) => !usedIds.has(point.id)).map((point) => point.id)
}

function getSegmentIntersection(
  a1: PlanPoint,
  a2: PlanPoint,
  b1: PlanPoint,
  b2: PlanPoint,
): PlanPoint | undefined {
  const aDx = a2.x - a1.x
  const aDy = a2.y - a1.y
  const bDx = b2.x - b1.x
  const bDy = b2.y - b1.y

  const denominator = aDx * bDy - aDy * bDx
  // Paralel (veya üst üste) segmentlerin tek bir kesişim noktası yoktur.
  if (Math.abs(denominator) < EPSILON_CM) return undefined

  const aRatio = ((b1.x - a1.x) * bDy - (b1.y - a1.y) * bDx) / denominator
  const bRatio = ((b1.x - a1.x) * aDy - (b1.y - a1.y) * aDx) / denominator
  if (aRatio < 0 || aRatio > 1 || bRatio < 0 || bRatio > 1) return undefined

  return { x: normalizeZero(a1.x + aDx * aRatio), y: normalizeZero(a1.y + aDy * aRatio) }
}

/**
 * Yakalanabilir noktalar: iki uç, orta nokta, diğer duvarlarla kesişimler.
 * Sabit aralıklı bölüm noktası ÜRETİLMEZ — bkz. knowledge/snap-contract.md.
 */
export function getSnapPoints(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): PlanPoint[] {
  return getSnapPointsFrom(wall, buildPointIndex(points), walls)
}

/**
 * `getSnapPoints`'in indeksli hâli. Duvar döngüsü içinden çağrılan yerler
 * indeksi BİR kez kurup bunu çağırır: aksi hâlde iç döngüdeki uç çözümü havuzu
 * baştan tarar ve maliyet O(N²·P) olur.
 */
export function getSnapPointsFrom(
  wall: Wall,
  pointIndex: PointIndex,
  walls: readonly Wall[],
): PlanPoint[] {
  const ends = getWallEndsFrom(wall, pointIndex)
  if (!ends) return []

  const result: PlanPoint[] = [ends.p1, ends.p2, getSegmentMidpoint(ends.p1, ends.p2)]

  for (const other of walls) {
    if (other.id === wall.id || other.floorId !== wall.floorId) continue

    const otherEnds = getWallEndsFrom(other, pointIndex)
    if (!otherEnds) continue

    const intersection = getSegmentIntersection(ends.p1, ends.p2, otherEnds.p1, otherEnds.p2)
    // Ortak köşe zaten uç olarak listede; tekrar eklenmesin.
    if (intersection && !result.some((existing) => isSamePlanPoint(existing, intersection))) {
      result.push(intersection)
    }
  }

  return result
}

/** Uçta duvar yoksa 0; birden çok duvar birleşiyorsa en kalını esas alınır. */
export function getNeighbourThicknessCm(wall: Wall, pointId: Id, walls: readonly Wall[]): number {
  const neighbours = getWallsAtPoint(pointId, walls).filter((other) => other.id !== wall.id)
  if (neighbours.length === 0) return 0
  return Math.max(...neighbours.map((neighbour) => neighbour.thickness))
}

/**
 * Köşede dik duvarın kütlesi var, açıklık oraya sığmaz: uçtan itibaren o duvarın
 * kalınlığı kadar mesafe bırakılır (K11). minOffsetCm > maxOffsetCm ise duvara
 * hiç açıklık sığmıyordur.
 */
export function getPlacementRange(
  wall: Wall,
  points: readonly Point[],
  walls: readonly Wall[],
): PlacementRange | undefined {
  const ends = getWallEnds(wall, points)
  if (!ends) return undefined

  const lengthCm = getSegmentLength(ends.p1, ends.p2)
  return {
    minOffsetCm: getNeighbourThicknessCm(wall, wall.p1Id, walls),
    maxOffsetCm: lengthCm - getNeighbourThicknessCm(wall, wall.p2Id, walls),
  }
}

/**
 * Verilen duvarların uçlarındaki köşe id'leri. Grup dönüşümü ve çoğaltma
 * ikisi de bunu istiyor; `store/` tarafında dursaydı iki dosya birbirini
 * import eder ve çalışma zamanı döngüsü oluşurdu (K17'nin aynı tuzağı).
 *
 * Set: bir köşeyi iki duvar paylaşabilir, dönüşüm iki kez uygulanmasın.
 */
export function collectWallPointIds(
  walls: readonly Wall[],
  wallIds: readonly Id[],
): Set<Id> {
  const targets = new Set(wallIds)
  const pointIds = new Set<Id>()

  for (const wall of walls) {
    if (!targets.has(wall.id)) continue
    pointIds.add(wall.p1Id)
    pointIds.add(wall.p2Id)
  }

  return pointIds
}

/**
 * Taşınan bir duvarın YENİ segmenti, KİMLİĞİYLE birlikte.
 *
 * `wallId` şart: duvarın kendi açıklıkları da kontrol ediliyor (sabit bir duvar
 * taşınan duvarın kapısının içine girebilir) ve o açıklıkları bulmanın tek yolu
 * kimlik. Uçların sırası duvarın `p1Id → p2Id` sırasıyla AYNI olmak zorunda:
 * `Opening.offsetCm` p1 ucundan ölçülüyor, ters çevrilmiş bir segmentte açıklık
 * duvarın öbür ucunda aranırdı.
 */
export type MovedWallSegment = WallEnds & { wallId: Id }

/** Bir köşenin taşınmasından etkilenen (hareket eden) duvarlar ile hareket ETMEYENLER. */
export type PointMoveImpact = {
  /** Etkilenen her duvarın YENİ (önerilen) segmenti. */
  segments: MovedWallSegment[]
  /** Etkilenmeyen duvarlar — açıklık çakışması bunlara karşı kontrol edilir. */
  stationaryWalls: Wall[]
}

/**
 * Bir köşe `targetPosition`'a taşınırsa hangi duvarların nasıl değişeceği.
 *
 * Köşeye bağlı duvarların SABİT ucu yerinde kalır, taşınan uç `targetPosition`'a
 * gider — `movePoint`'in kendisinin yaptığı şey, burada YAZMADAN ÖNCE aynı
 * hesabı yapıp açıklık çakışmasını sınamak için (K36).
 */
export function getPointMoveImpact(
  pointId: Id,
  targetPosition: PlanPoint,
  walls: readonly Wall[],
  points: readonly Point[],
): PointMoveImpact {
  const movingWalls = getWallsAtPoint(pointId, walls)
  const movingWallIds = new Set(movingWalls.map((wall) => wall.id))

  const segments = movingWalls.flatMap((wall): MovedWallSegment[] => {
    const isMovingP1 = wall.p1Id === pointId
    const otherPointId = isMovingP1 ? wall.p2Id : wall.p1Id
    const otherPoint = findPoint(points, otherPointId)
    if (!otherPoint) return []

    // Uçlar duvarın p1 → p2 sırasında yazılır (taşınan uç hangisiyse oraya):
    // açıklığın offset'i p1'den ölçülüyor, ters segmentte yanlış uçtan aranırdı.
    const other = { x: otherPoint.x, y: otherPoint.y }
    return [
      {
        wallId: wall.id,
        p1: isMovingP1 ? targetPosition : other,
        p2: isMovingP1 ? other : targetPosition,
      },
    ]
  })

  return {
    segments,
    stationaryWalls: walls.filter((wall) => !movingWallIds.has(wall.id)),
  }
}

/**
 * Bir duvar grubu (`wallIds`) katı olarak `(dxCm, dyCm)` ötelenirse hangi
 * duvarların nasıl değişeceği. `moveWall`/`transformSelection`'ın taşıma
 * kısmıyla aynı hesap, YAZMADAN ÖNCE açıklık çakışmasını sınamak için (K36).
 */
export function getWallMoveImpact(
  wallIds: readonly Id[],
  dxCm: number,
  dyCm: number,
  walls: readonly Wall[],
  points: readonly Point[],
): PointMoveImpact {
  const movingWallIds = new Set(wallIds)

  const segments = wallIds.flatMap((wallId): MovedWallSegment[] => {
    const wall = walls.find((candidate) => candidate.id === wallId)
    if (!wall) return []
    const ends = getWallEnds(wall, points)
    if (!ends) return []
    return [
      {
        wallId,
        p1: { x: ends.p1.x + dxCm, y: ends.p1.y + dyCm },
        p2: { x: ends.p2.x + dxCm, y: ends.p2.y + dyCm },
      },
    ]
  })

  return {
    segments,
    stationaryWalls: walls.filter((wall) => !movingWallIds.has(wall.id)),
  }
}
