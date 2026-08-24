import type { PlanPoint } from './coords'
import { snapPointToGrid } from './grid'
import type { Id, Point, Wall } from './model'
import {
  buildPointIndex,
  getSegmentLength,
  getSnapPointsFrom,
  getWallEndsFrom,
  projectPointOntoWall,
  type PointIndex,
  type WallEnds,
} from './wall'

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
  /** Sürüklenen köşenin İKİ komşusundan geçen doğru: 180° yakalaması (K162). */
  | 'collinear'
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
  /**
   * Sürüklenen köşenin iki komşusu; verilirse köşe onların doğrusuna yapışır
   * (K162). Çağıran veriyor çünkü "hangi noktanın komşuları" bilgisi sürükleme
   * durumunda, snap'in kendisinde değil.
   */
  collinearGuide?: { from: PlanPoint; to: PlanPoint }
}

/**
 * Hedefin, iki komşudan geçen DOĞRU üzerindeki izdüşümü — 180° yakalaması.
 *
 * Eksen hizalaması DEĞİL: doğru neredeyse oradadır, bu yüzden eğik duvarlarda
 * da çalışır. Kullanıcı bildirimi tam olarak oradan geldi — ızgara yakalaması
 * eğik bir duvarın doğrultusuyla hiçbir zaman çakışmıyor ve köşeyi geri
 * düzleştirmek imkânsıza yakın oluyordu.
 *
 * ⚠️ Yalnız komşuların ARASINA düşen izdüşüm kabul edilir (0 < t < 1). Dışarıda
 * kalan nokta doğru üzerinde olsa bile açı 180° değil 0°'dir: iki kol aynı yöne
 * katlanır. Orada yakalamak, kullanıcıyı düzleştirdiğini sanırken duvarı
 * katlamış hâle getirirdi.
 */
function findCollinearSnap(
  target: PlanPoint,
  guide: { from: PlanPoint; to: PlanPoint },
  toleranceCm: number,
): PlanPoint | undefined {
  const dx = guide.to.x - guide.from.x
  const dy = guide.to.y - guide.from.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return undefined

  const t = ((target.x - guide.from.x) * dx + (target.y - guide.from.y) * dy) / lengthSquared
  if (t <= 0 || t >= 1) return undefined

  const point = { x: guide.from.x + dx * t, y: guide.from.y + dy * t }
  return Math.hypot(target.x - point.x, target.y - point.y) <= toleranceCm ? point : undefined
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

/**
 * Duvarın sınır kutusu toleransla genişletildiğinde hedefi içeriyor mu?
 *
 * Eleme GÜVENLİ: bir duvarın ürettiği aday noktaların hepsi (iki uç, orta nokta,
 * başka duvarlarla kesişimler, gövde izdüşümü) o duvarın ÜSTÜNDE, yani sınır
 * kutusunun içinde. Kutuya tolerans kadar bile yaklaşamayan duvar toleransa
 * giren hiçbir aday üretemez. Kutu testi gerçek mesafeden gevşek — bilerek:
 * yanlışlıkla eleme yapmaz, yalnız uzaktakileri ucuza atar.
 */
function isWallNearTarget(target: PlanPoint, ends: WallEnds, toleranceCm: number): boolean {
  return (
    target.x >= Math.min(ends.p1.x, ends.p2.x) - toleranceCm &&
    target.x <= Math.max(ends.p1.x, ends.p2.x) + toleranceCm &&
    target.y >= Math.min(ends.p1.y, ends.p2.y) - toleranceCm &&
    target.y <= Math.max(ends.p1.y, ends.p2.y) + toleranceCm
  )
}

function findNearestWallSnapPoint(
  target: PlanPoint,
  pointIndex: PointIndex,
  walls: readonly Wall[],
  toleranceCm: number,
): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const wall of walls) {
    // Eleme dıştaki döngüde: `getSnapPointsFrom` kendi içinde TÜM duvarları
    // dolaşıp kesişim arıyor, yani elenen her duvar bir O(N) taramayı götürüyor.
    const ends = getWallEndsFrom(wall, pointIndex)
    if (!ends || !isWallNearTarget(target, ends, toleranceCm)) continue

    for (const point of getSnapPointsFrom(wall, pointIndex, walls)) {
      candidates.push({ point, distanceCm: getSegmentLength(target, point), wallId: wall.id })
    }
  }
  return pickNearest(candidates, toleranceCm)
}

function findNearestWallEdge(
  target: PlanPoint,
  context: SnapContext,
  pointIndex: PointIndex,
  walls: readonly Wall[],
  toleranceCm: number,
): Candidate | undefined {
  const candidates: Candidate[] = []
  for (const wall of walls) {
    const ends = getWallEndsFrom(wall, pointIndex)
    if (!ends || !isWallNearTarget(target, ends, toleranceCm)) continue

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

  // İndeks çağrı başına BİR kez: duvar döngülerinin içinde kurulursa kazanç gider.
  // Kat süzmesi yapılmaz — duvarlar başka kattaki noktalara referans vermiyor,
  // ama süzülmüş havuz uçları çözemeyecek duruma düşürebilirdi.
  const pointIndex = buildPointIndex(context.points)

  // ⚠️ Gerçek köşeden SONRA, ötekilerden ÖNCE: var olan bir köşeye kaynamak
  // düzleştirmekten önemli (aynı yerde ikinci Point doğarsa graf kopar), ama
  // ızgara ve komşu duvar kenarı 180°'nin önüne geçmemeli — kullanıcının
  // şikâyeti tam olarak ızgaranın kazanmasıydı.
  if (options.collinearGuide) {
    const collinear = findCollinearSnap(target, options.collinearGuide, options.toleranceCm)
    if (collinear) return { point: collinear, kind: 'collinear' }
  }

  const nearestWallSnapPoint = findNearestWallSnapPoint(
    target,
    pointIndex,
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

  const nearestWallEdge = findNearestWallEdge(
    target,
    context,
    pointIndex,
    floorWalls,
    options.toleranceCm,
  )
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
