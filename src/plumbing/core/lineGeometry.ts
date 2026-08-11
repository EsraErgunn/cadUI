import { normalizeZero, type PlanPoint } from '../../core/coords'

/** Bir hat en az bir segment taşır; tek noktalı taslak kaydedilmez. */
export const MIN_LINE_POINT_COUNT = 2

export function getSegmentLengthCm(from: PlanPoint, to: PlanPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

/** Aynı yere ikinci tık sıfır boy boru üretirdi; adım yazılmaz (duvar aracıyla aynı kural). */
export function isSamePoint(a: PlanPoint, b: PlanPoint): boolean {
  return a.x === b.x && a.y === b.y
}

export function hasEnoughPoints(points: readonly PlanPoint[]): boolean {
  return points.length >= MIN_LINE_POINT_COUNT
}

/** Ölçü etiketinin çapası: bölümün dünya orta noktası (ekran koordinatı saklanmaz, R9). */
export function getSegmentMidpoint(from: PlanPoint, to: PlanPoint): PlanPoint {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
}

/**
 * Bir bölümün üstüne düşen ayrım noktasının iki yanındaki uzunluklar: boru orada
 * bölünürse doğacak iki parçanın boyu. Yarımlardan biri sıfırsa null — nokta
 * bölümün UCUNA denk gelmiştir, orada boru ayrılmaz (lineSnap köşeye yapıştırır)
 * ve sıfır boy bir ölçü yazılırdı.
 */
export function getSplitLengthsCm(
  from: PlanPoint,
  to: PlanPoint,
  at: PlanPoint,
): readonly [number, number] | null {
  const fromLengthCm = getSegmentLengthCm(from, at)
  const toLengthCm = getSegmentLengthCm(at, to)
  if (fromLengthCm === 0 || toLengthCm === 0) return null

  return [fromLengthCm, toLengthCm]
}

/**
 * Bölüme dik BİRİM vektör. Etiket bunun yönünde kaydırılır, yoksa yazı borunun
 * üstüne biner ve okunmaz. Sıfır boy bölümde yön tanımsızdır → sıfır vektör
 * (etiket orta noktada kalır).
 */
export function getSegmentNormal(from: PlanPoint, to: PlanPoint): PlanPoint {
  const lengthCm = getSegmentLengthCm(from, to)
  if (lengthCm === 0) return { x: 0, y: 0 }

  // İşaret çevirme -0 üretir; koordinatlarda -0 dolaşırsa karşılaştırmalar şaşar.
  return {
    x: normalizeZero(-(to.y - from.y) / lengthCm),
    y: normalizeZero((to.x - from.x) / lengthCm),
  }
}

/**
 * Ölçü yazısının duracağı yer: bölümün orta noktası, dikinde `offsetCm` kadar
 * kaydırılmış hâli — yazı borunun üstüne binmesin. Kaydırma miktarı ÇAĞIRANDAN
 * gelir çünkü ekran pikselinden türer (px/zoom) ve core zoom'u tanımaz.
 */
export function getMeasurementAnchor(
  from: PlanPoint,
  to: PlanPoint,
  offsetCm: number,
): PlanPoint {
  const midpoint = getSegmentMidpoint(from, to)
  const normal = getSegmentNormal(from, to)

  return { x: midpoint.x + normal.x * offsetCm, y: midpoint.y + normal.y * offsetCm }
}
