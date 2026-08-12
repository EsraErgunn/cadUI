import { DISCHARGE_WIDTH_CM, type DischargeLineKind } from './lineKinds'
import { normalizeZero, type PlanPoint } from '../../core/coords'

export type DischargeStrokeRole = 'wall' | 'cap' | 'mark'

export type DischargeStroke = {
  /** React key — indeks DEĞİL (symbolShapes.ts'teki desenle aynı). */
  name: string
  role: DischargeStrokeRole
  points: PlanPoint[]
}

/**
 * Mitre uzunluğu yarı genişliğin bu katını aşarsa köşe BEVEL'e düşer. Dar açıda
 * mitre noktası sonsuza gider; `frustumCulled={false}` çizilen bir çizgide bu,
 * ekranı baştan başa geçen dev bir çıkıntı demek.
 */
const MITER_LIMIT_RATIO = 4

/** Bu uzunluğun altındaki segment yön vektörü üretemez, atlanır. */
const MIN_SEGMENT_LENGTH_CM = 1e-6

/**
 * Kanalın iç deseni. Damga SVG'lerinden BİREBİR devralındı — baca (`chimney.svg`)
 * gövde boyunca eğik taramalar taşıyordu, havalandırma (`ventilation-duct.svg`)
 * dik panjur çizgileri. Güzergâha dönüşürken desen kayboldu ve ikisi de çıplak
 * çift çizgi olarak birbirinin aynı göründü; burada geri getiriliyor.
 *
 * `slantRatio` işaretin genişliğe oranla boy doğrultusunda kaç kayacağı:
 * chimney.svg'de tarama 16 birimlik gövdede 8 birim yükseliyordu → 0.5.
 */
type DischargeMarkStyle = {
  spacingCm: number
  slantRatio: number
  /** Kapak kanaldan bu kadar taşar (1 = tam kanal genişliği, taşma yok). */
  capWidthRatio: number
}

const MARK_STYLES: Record<DischargeLineKind, DischargeMarkStyle> = {
  // chimney.svg: 44 birim gövdede 3 tarama ≈ 12 birimde bir; kapak 28/16 = 1.75×.
  chimney: { spacingCm: 14, slantRatio: 0.5, capWidthRatio: 1.75 },
  // ventilation-duct.svg: 52 birim gövdede 5 panjur ≈ 9 birimde bir, dik, kapaksız taşma.
  ventilationDuct: { spacingCm: 11, slantRatio: 0, capWidthRatio: 1 },
}

type Vector = { x: number; y: number }

function subtract(to: PlanPoint, from: PlanPoint): Vector {
  return { x: to.x - from.x, y: to.y - from.y }
}

/** Sola doğru birim dik — offset yönü. */
function leftNormal(direction: Vector): Vector {
  return { x: -direction.y, y: direction.x }
}

function shift(point: PlanPoint, normal: Vector, distanceCm: number): PlanPoint {
  return {
    x: normalizeZero(point.x + normal.x * distanceCm),
    y: normalizeZero(point.y + normal.y * distanceCm),
  }
}

/** Ardışık aynı noktalar elenir: sıfır boy segment yön veremez. */
function dropRepeatedPoints(points: readonly PlanPoint[]): PlanPoint[] {
  const cleaned: PlanPoint[] = []
  for (const point of points) {
    const previous = cleaned.at(-1)
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < MIN_SEGMENT_LENGTH_CM) {
      continue
    }
    cleaned.push(point)
  }
  return cleaned
}

function getUnitDirections(points: readonly PlanPoint[]): Vector[] {
  const directions: Vector[] = []
  for (let index = 0; index + 1 < points.length; index += 1) {
    const delta = subtract(points[index + 1], points[index])
    const lengthCm = Math.hypot(delta.x, delta.y)
    directions.push({ x: delta.x / lengthCm, y: delta.y / lengthCm })
  }
  return directions
}

/**
 * İki komşu segmentin ofset kenarlarının kesiştiği köşe noktası.
 *
 * Mitre vektörü `m = (nA + nB) / (1 + nA·nB)`; uzunluğu `1/cos(θ/2)`, yani dönüş
 * sertleştikçe büyür. Düz devamda `m = n` (köşe yok), tam geri dönüşte payda
 * sıfırlanır. Payda sıfıra yakınsa ya da mitre limiti aşılırsa `null` döner ve
 * çağıran BEVEL'e düşer — yoksa köşe noktası sonsuza kaçar.
 */
function getMiterPoint(
  corner: PlanPoint,
  incoming: Vector,
  outgoing: Vector,
  offsetCm: number,
): PlanPoint | null {
  const incomingNormal = leftNormal(incoming)
  const outgoingNormal = leftNormal(outgoing)
  const denominator =
    1 + (incomingNormal.x * outgoingNormal.x + incomingNormal.y * outgoingNormal.y)
  if (Math.abs(denominator) < MIN_SEGMENT_LENGTH_CM) return null

  const miter = {
    x: (incomingNormal.x + outgoingNormal.x) / denominator,
    y: (incomingNormal.y + outgoingNormal.y) / denominator,
  }
  if (Math.hypot(miter.x, miter.y) > MITER_LIMIT_RATIO) return null

  return {
    x: normalizeZero(corner.x + miter.x * offsetCm),
    y: normalizeZero(corner.y + miter.y * offsetCm),
  }
}

/** Bir kenarın (sol ya da sağ) köşe köşe noktaları. */
function buildOffsetSide(
  points: readonly PlanPoint[],
  directions: readonly Vector[],
  offsetCm: number,
): PlanPoint[] {
  const side: PlanPoint[] = [shift(points[0], leftNormal(directions[0]), offsetCm)]

  for (let index = 1; index + 1 < points.length; index += 1) {
    const incoming = directions[index - 1]
    const outgoing = directions[index]
    const miter = getMiterPoint(points[index], incoming, outgoing, offsetCm)

    if (miter) {
      side.push(miter)
      continue
    }
    // Bevel: iki kenarın kendi uçları ayrı ayrı yazılır, köşe pahlanır.
    side.push(shift(points[index], leftNormal(incoming), offsetCm))
    side.push(shift(points[index], leftNormal(outgoing), offsetCm))
  }

  const lastIndex = points.length - 1
  side.push(shift(points[lastIndex], leftNormal(directions[lastIndex - 1]), offsetCm))
  return side
}

/**
 * Kanalın iç desenini segment segment döşer. İşaretler köşelere yarım genişlik
 * kadar YAKLAŞTIRILMAZ: mitrenin içeri çektiği kenarla kesişip dışarı taşarlardı.
 */
function buildMarks(
  points: readonly PlanPoint[],
  directions: readonly Vector[],
  halfWidthCm: number,
  style: DischargeMarkStyle,
): DischargeStroke[] {
  const marks: DischargeStroke[] = []
  const slantCm = halfWidthCm * style.slantRatio

  for (let index = 0; index + 1 < points.length; index += 1) {
    const from = points[index]
    const direction = directions[index]
    const normal = leftNormal(direction)
    const segmentLengthCm = Math.hypot(
      points[index + 1].x - from.x,
      points[index + 1].y - from.y,
    )

    // Köşe payı: ilk işaret bir yarım genişlik içeriden başlar, sonuncusu da
    // o kadar önce biter.
    for (
      let offsetCm = halfWidthCm + style.spacingCm / 2;
      offsetCm < segmentLengthCm - halfWidthCm;
      offsetCm += style.spacingCm
    ) {
      const center = shift(from, direction, offsetCm)
      const leftEnd = shift(shift(center, normal, halfWidthCm), direction, slantCm)
      const rightEnd = shift(shift(center, normal, -halfWidthCm), direction, -slantCm)
      marks.push({
        name: `mark-${index}-${Math.round(offsetCm)}`,
        role: 'mark',
        points: [rightEnd, leftEnd],
      })
    }
  }

  return marks
}

export type DischargeCapOptions = {
  /** Cihaza giren uç KAPATILMAZ: kanal oraya bağlanıyor, duvarı yoktur. */
  hasStartCap: boolean
  hasEndCap: boolean
}

/**
 * Bir baca/havalandırma güzergâhının plan çizimi: merkez hattının iki yanında
 * `widthCm/2` uzaklıkta iki duvar çizgisi, içeride türe özgü desen (baca eğik
 * tarama, havalandırma dik panjur) ve istenen uçlarda kapak. Kanal içi BOŞ kalır
 * — mimari alan nesneleriyle (AreaObject) aynı çizim dili.
 *
 * Bacanın uç kapağı kanaldan TAŞAR (`capWidthRatio`), damga SVG'sindeki şapka
 * çizgisi gibi; havalandırmanınki kanalla aynı hizada kapanır.
 *
 * Nokta sayısı 2'nin altına düşerse (tekrarlar elendikten sonra da) boş dizi
 * döner: dejenere bir kanal çizilmez.
 */
export function getDischargeRunGeometry(
  kind: DischargeLineKind,
  centerline: readonly PlanPoint[],
  options: DischargeCapOptions,
): DischargeStroke[] {
  const points = dropRepeatedPoints(centerline)
  const widthCm = DISCHARGE_WIDTH_CM[kind]
  if (points.length < 2 || widthCm <= 0) return []

  const style = MARK_STYLES[kind]
  const directions = getUnitDirections(points)
  const halfWidthCm = widthCm / 2
  const left = buildOffsetSide(points, directions, halfWidthCm)
  const right = buildOffsetSide(points, directions, -halfWidthCm)

  const strokes: DischargeStroke[] = [
    { name: 'wallLeft', role: 'wall', points: left },
    { name: 'wallRight', role: 'wall', points: right },
  ]

  const capHalfWidthCm = halfWidthCm * style.capWidthRatio
  if (options.hasStartCap) {
    const normal = leftNormal(directions[0])
    strokes.push({
      name: 'capStart',
      role: 'cap',
      points: [
        shift(points[0], normal, capHalfWidthCm),
        shift(points[0], normal, -capHalfWidthCm),
      ],
    })
  }
  if (options.hasEndCap) {
    const lastPoint = points.at(-1)!
    const normal = leftNormal(directions.at(-1)!)
    strokes.push({
      name: 'capEnd',
      role: 'cap',
      points: [
        shift(lastPoint, normal, capHalfWidthCm),
        shift(lastPoint, normal, -capHalfWidthCm),
      ],
    })
  }

  strokes.push(...buildMarks(points, directions, halfWidthCm, style))
  return strokes
}
