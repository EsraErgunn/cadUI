import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import { getSegmentAngleDeg, getSegmentLength } from './wall'

const FULL_TURN_DEG = 360
const HALF_TURN_DEG = 180
const DEG_TO_RAD = Math.PI / 180

/** Bundan dar açı yazılmaz: iki duvar neredeyse çakışıktır, sayı okunmaz. */
const MIN_LABELED_ANGLE_DEG = 1

/** Köşeye bu uzaklıktan kısa duvara bakılmaz — sıfır boy duvarın yönü tanımsız. */
const MIN_WALL_LENGTH_CM = 1e-6

export type CornerAngleAnnotation = {
  /** React anahtarı: bir köşe birden çok açı üretiyor, nokta id'si yetmez. */
  key: string
  pointId: Id
  /** Köşenin kendisi: geometrik işaret (yay / dik açı karesi) buradan çizilir. */
  corner: PlanPoint
  /** Açının yazılacağı nokta: köşeden AÇIORTAY boyunca kaydırılmış. */
  position: PlanPoint
  /** İşaretin başlayacağı yön (derece); açı buradan saat yönünün TERSİNE süpürülür. */
  startAngleDeg: number
  angleDeg: number
}

export type CornerAngleOptions = {
  activeFloorId: Id
  /** Yazının köşeye uzaklığı (cm). Ekran-sabit isteniyorsa çağıran `px / zoom` verir. */
  offsetCm: number
  /**
   * Verilirse YALNIZ bu köşelerin açısı yazılır. Açı katmanı kapalıyken
   * sürüklenen köşeyi geçici göstermek için.
   */
  pointIds?: readonly Id[]
}

/** Dik açı sayılma toleransı: trigonometriden 89.9999 çıkabiliyor. */
const RIGHT_ANGLE_TOLERANCE_DEG = 0.5
const RIGHT_ANGLE_DEG = 90

/** Yay kaç derecede bir kırılsın; 6° dairesel görünmeye yetiyor. */
const ARC_STEP_DEG = 6

type CornerEdge = {
  /** Köşeden KOMŞUYA bakan yön (derece, -180..180). */
  directionDeg: number
}

/** 0..360 aralığına indirger; iki yön arasındaki açı hep pozitif okunsun. */
function normalizeTurn(angleDeg: number): number {
  const wrapped = angleDeg % FULL_TURN_DEG
  return wrapped < 0 ? wrapped + FULL_TURN_DEG : wrapped
}

function collectCornerEdges(
  walls: readonly Wall[],
  pointById: ReadonlyMap<Id, Point>,
  floorId: Id,
): Map<Id, CornerEdge[]> {
  const edgesByPointId = new Map<Id, CornerEdge[]>()

  const push = (pointId: Id, from: Point, to: Point) => {
    // Sıfır boy duvarın yönü tanımsız; atan2(0,0) sessizce 0 döndürür ve
    // köşeye var olmayan bir kol ekler.
    if (getSegmentLength(from, to) < MIN_WALL_LENGTH_CM) return

    const edges = edgesByPointId.get(pointId)
    const edge: CornerEdge = { directionDeg: getSegmentAngleDeg(from, to) }
    if (edges) edges.push(edge)
    else edgesByPointId.set(pointId, [edge])
  }

  for (const wall of walls) {
    if (wall.floorId !== floorId) continue

    const p1 = pointById.get(wall.p1Id)
    const p2 = pointById.get(wall.p2Id)
    if (!p1 || !p2) continue

    push(wall.p1Id, p1, p2)
    push(wall.p2Id, p2, p1)
  }

  return edgesByPointId
}

/**
 * Köşelerde buluşan duvarların arasındaki açılar.
 *
 * Kollar yön açısına göre SIRALANIR, sonra ardışık çiftlerin arası ölçülür —
 * toplamları 360° eder. Sıralama olmadan "komşu kol" tanımsız kalırdı: üç kollu
 * bir birleşimde hangi ikisinin arasının ölçüleceği duvarların çizim sırasına
 * düşerdi.
 *
 * Etiket AÇIORTAY üzerinde durur: iki kolun tam ortasında, yani ölçtüğü
 * boşluğun içinde. Kolların yön VEKTÖRLERİNİ toplamak da açıortay verirdi ama
 * 180°'ye yakın açıda toplam sıfıra gider ve yön kaybolur; buradaki hesap
 * (ilk kolu açının yarısı kadar döndürmek) her açıda çalışır.
 */
export function getCornerAngleAnnotations(
  walls: readonly Wall[],
  points: readonly Point[],
  options: CornerAngleOptions,
): CornerAngleAnnotation[] {
  const pointById = new Map<Id, Point>()
  for (const point of points) pointById.set(point.id, point)

  const annotations: CornerAngleAnnotation[] = []

  for (const [pointId, edges] of collectCornerEdges(walls, pointById, options.activeFloorId)) {
    if (edges.length < 2) continue
    if (options.pointIds && !options.pointIds.includes(pointId)) continue

    const corner = pointById.get(pointId)
    if (!corner) continue

    const sorted = [...edges].sort((a, b) => a.directionDeg - b.directionDeg)

    for (let index = 0; index < sorted.length; index += 1) {
      const from = sorted[index]!
      const to = sorted[(index + 1) % sorted.length]!
      const turnDeg = normalizeTurn(to.directionDeg - from.directionDeg)

      if (turnDeg < MIN_LABELED_ANGLE_DEG) continue
      // İKİ kollu köşede ikinci açı hep 360−ilki: aynı köşeyi öbür yandan
      // ölçer, yeni bir şey söylemez ve planı ikiye katlar. Üç ve daha çok
      // kolda ise her boşluk ayrı bir gerçek, hepsi yazılır.
      if (sorted.length === 2 && turnDeg >= HALF_TURN_DEG) continue

      const bisectorRad = (from.directionDeg + turnDeg / 2) * DEG_TO_RAD

      annotations.push({
        key: `angle-${pointId}-${index}`,
        pointId,
        corner: { x: corner.x, y: corner.y },
        position: {
          x: normalizeZero(corner.x + Math.cos(bisectorRad) * options.offsetCm),
          y: normalizeZero(corner.y + Math.sin(bisectorRad) * options.offsetCm),
        },
        startAngleDeg: from.directionDeg,
        angleDeg: turnDeg,
      })
    }
  }

  return annotations
}

/**
 * Açının altına çizilecek geometrik işaretin köşe noktaları, sırayla.
 *
 * Dik açıda YAY DEĞİL KARE: teknik çizimin evrensel gösterimi, "burası tam 90°"
 * demenin sayıya bakmadan okunan hâli. Kare, iki kolun radius kadar ilerisindeki
 * noktaları köşegen üzerinden birleştirir — üç nokta, iki çizgi.
 *
 * Diğer açılarda daire dilimi yayı. Yay ADIM ADIM örnekleniyor; adım sayısı
 * açıyla büyüyor ki dar açıda gereksiz nokta, geniş açıda köşeli görünüm olmasın.
 *
 * Yarıçap çağırandan gelir (ekran-sabit isteniyorsa `px / zoom`): işaretin
 * dünya boyunda büyümesi gerekmiyor, ekranda aynı kalması gerekiyor.
 */
export function getCornerAngleMarkerPoints(
  annotation: Pick<CornerAngleAnnotation, 'corner' | 'startAngleDeg' | 'angleDeg'>,
  radiusCm: number,
): PlanPoint[] {
  const { corner, startAngleDeg, angleDeg } = annotation
  const startRad = startAngleDeg * DEG_TO_RAD
  const endRad = (startAngleDeg + angleDeg) * DEG_TO_RAD

  const atAngle = (angleRad: number, distanceCm: number): PlanPoint => ({
    x: normalizeZero(corner.x + Math.cos(angleRad) * distanceCm),
    y: normalizeZero(corner.y + Math.sin(angleRad) * distanceCm),
  })

  if (Math.abs(angleDeg - RIGHT_ANGLE_DEG) < RIGHT_ANGLE_TOLERANCE_DEG) {
    // Karenin dış köşesi iki kenarın toplamı; kenar uzunluğu radius olduğu için
    // köşegen radius√2 uzakta, açıortay üzerinde.
    const diagonalRad = (startAngleDeg + angleDeg / 2) * DEG_TO_RAD
    return [
      atAngle(startRad, radiusCm),
      atAngle(diagonalRad, radiusCm * Math.SQRT2),
      atAngle(endRad, radiusCm),
    ]
  }

  const stepCount = Math.max(2, Math.ceil(angleDeg / ARC_STEP_DEG))
  const arc: PlanPoint[] = []
  for (let step = 0; step <= stepCount; step += 1) {
    arc.push(atAngle(startRad + ((endRad - startRad) * step) / stepCount, radiusCm))
  }
  return arc
}
