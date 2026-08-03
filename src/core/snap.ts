import type { PlanPoint } from './coords'
import { snapPointToGrid } from './grid'
import type { Id, Point, Wall } from './model'
import { getSegmentLength, getSnapPoints, projectPointOntoWall } from './wall'

/** Yakalama yarıçapı ekran mesafesidir: uzaklaşınca cm karşılığı büyür, his sabit kalır. */
export const SNAP_TOLERANCE_PX = 10

/** Aynı koordinat sayılma eşiği; toleranstan farklı olarak kayan nokta payı kadardır. */
const COINCIDENT_EPSILON_CM = 1e-6

export type SnapKind =
  /** Var olan bir köşe noktası. */
  | 'point'
  /** Duvarın ucu/ortası veya iki duvarın kesişimi. */
  | 'wallSnapPoint'
  /** Duvarın gövdesi — eksene dik izdüşüm. */
  | 'wallEdge'
  | 'grid'
  | 'none'

export type SnapResult = {
  point: PlanPoint
  kind: SnapKind
  /**
   * Var olan bir köşeye yapışıldıysa o Point'in id'si. Aynı yerde ikinci bir
   * Point üretilirse duvarlar kopuk görünür ve mahal çevrimi kapanmaz.
   */
  pointId?: Id
  wallId?: Id
}

export type SnapContext = {
  points: readonly Point[]
  walls: readonly Wall[]
  floorId: Id
}

export type SnapOptions = {
  toleranceCm: number
  gridStepCm: number
  /** Kapalıyken hiçbir hedefe yakınlaşmayan imleç olduğu yerde kalır. */
  isGridSnapEnabled: boolean
}

/** zoom = 1 cm başına px olduğundan, px eşiği zoom'a bölünerek cm'ye çevrilir. */
export function getSnapToleranceCm(zoom: number): number {
  return SNAP_TOLERANCE_PX / zoom
}

/**
 * Var olan bir çizime mi yapışıldı? Izgara ve serbest imleç hayır — onlar boşluğa
 * konumlandırmadır. Çizim araçları bunu "bağlandık, zinciri bitir" sinyali olarak
 * kullanır, önizleme de yapışma işaretini buna göre gösterir.
 */
export function isSnapOnExistingGeometry(kind: SnapKind | null): boolean {
  return kind === 'point' || kind === 'wallSnapPoint' || kind === 'wallEdge'
}

type Candidate = {
  point: PlanPoint
  distanceCm: number
  pointId?: Id
  wallId?: Id
}

function pickNearest(candidates: readonly Candidate[], toleranceCm: number): Candidate | undefined {
  let best: Candidate | undefined
  for (const candidate of candidates) {
    if (candidate.distanceCm > toleranceCm) continue
    if (!best || candidate.distanceCm < best.distanceCm) best = candidate
  }
  return best
}

function findNearestPoint(
  target: PlanPoint,
  points: readonly Point[],
  toleranceCm: number,
): Candidate | undefined {
  return pickNearest(
    points.map((point) => ({
      point: { x: point.x, y: point.y },
      distanceCm: getSegmentLength(target, point),
      pointId: point.id,
    })),
    toleranceCm,
  )
}

/** Bu koordinatta zaten bir köşe var mı? Toleranstan bağımsız, çakışma kontrolü. */
function findPointAt(position: PlanPoint, points: readonly Point[]): SnapResult | undefined {
  const existing = points.find(
    (point) =>
      Math.abs(point.x - position.x) < COINCIDENT_EPSILON_CM &&
      Math.abs(point.y - position.y) < COINCIDENT_EPSILON_CM,
  )
  return existing ? { point: { x: existing.x, y: existing.y }, kind: 'point', pointId: existing.id } : undefined
}

function findNearestWallSnapPoint(
  target: PlanPoint,
  context: SnapContext,
  walls: readonly Wall[],
  toleranceCm: number,
): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const wall of walls) {
    for (const point of getSnapPoints(wall, context.points, walls)) {
      candidates.push({ point, distanceCm: getSegmentLength(target, point), wallId: wall.id })
    }
  }
  return pickNearest(candidates, toleranceCm)
}

function findNearestWallEdge(
  target: PlanPoint,
  context: SnapContext,
  walls: readonly Wall[],
  toleranceCm: number,
): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const wall of walls) {
    const projection = projectPointOntoWall(wall, context.points, target)
    if (!projection) continue
    candidates.push({
      point: projection.point,
      distanceCm: projection.distanceCm,
      wallId: wall.id,
    })
  }
  return pickNearest(candidates, toleranceCm)
}

/**
 * Toleransta var olan bir köşe var mı? Seçim aracındaki hook'ların TAMAMI
 * (köşe sürükleme, açıklık, hover) bu TEK koşulu paylaşır. Her biri kendi
 * `resolveSnap` çağrısını yazarsa koşullar zamanla ayrışır ve tek basış iki
 * jest başlatır — bkz. knowledge/gesture-bus-precedence.md.
 *
 * Izgara bilerek hesaba katılmaz: sorulan şey "nereye yapışırım" değil,
 * "toleransta bir köşe var mı". `resolveSnap`'in köşe dalıyla aynı sonucu
 * verir çünkü orada da ilk bakılan şey budur.
 */
export function findCornerPointIdAt(
  target: PlanPoint,
  context: SnapContext,
  toleranceCm: number,
): Id | undefined {
  const floorPoints = context.points.filter((point) => point.floorId === context.floorId)
  return findNearestPoint(target, floorPoints, toleranceCm)?.pointId
}

/**
 * Öncelik sırası kabalıktan inceliğe gider: var olan köşe → duvarın anlamlı
 * noktası → duvar gövdesi → ızgara. Köşe en üstte çünkü ondan dönen `pointId`
 * aynı yerde ikinci bir nokta üretilmesini engelliyor.
 */
export function resolveSnap(
  target: PlanPoint,
  context: SnapContext,
  options: SnapOptions,
): SnapResult {
  const floorPoints = context.points.filter((point) => point.floorId === context.floorId)
  const floorWalls = context.walls.filter((wall) => wall.floorId === context.floorId)

  const nearestPoint = findNearestPoint(target, floorPoints, options.toleranceCm)
  if (nearestPoint) {
    return { point: nearestPoint.point, kind: 'point', pointId: nearestPoint.pointId }
  }

  const nearestWallSnapPoint = findNearestWallSnapPoint(
    target,
    context,
    floorWalls,
    options.toleranceCm,
  )
  if (nearestWallSnapPoint) {
    return {
      point: nearestWallSnapPoint.point,
      kind: 'wallSnapPoint',
      wallId: nearestWallSnapPoint.wallId,
    }
  }

  const nearestWallEdge = findNearestWallEdge(target, context, floorWalls, options.toleranceCm)
  if (nearestWallEdge) {
    return { point: nearestWallEdge.point, kind: 'wallEdge', wallId: nearestWallEdge.wallId }
  }

  if (options.isGridSnapEnabled) {
    const gridPoint = snapPointToGrid(target, options.gridStepCm)
    // Yuvarlama var olan bir köşenin üstüne düşebilir: tolerans dışında kalıp
    // ızgara sayesinde aynı koordinata gelen tıklama, id dönmezse orada İKİNCİ
    // bir Point üretir ve duvarlar sessizce kopuk kalır.
    return findPointAt(gridPoint, floorPoints) ?? { point: gridPoint, kind: 'grid' }
  }

  return findPointAt(target, floorPoints) ?? { point: target, kind: 'none' }
}
