import { normalizeZero, type PlanPoint } from './coords'
import { getSegmentLength, getSegmentMidpoint } from './wall'

/**
 * Bölüme dik BİRİM vektör. Ölçü yazısı bunun yönünde kaydırılır, yoksa çizginin
 * üstüne biner ve okunmaz. Sıfır boy bölümde yön tanımsızdır → sıfır vektör
 * (yazı orta noktada kalır).
 *
 * `plumbing/core/lineGeometry.ts`'ten buraya TAŞINDI: mimari ölçüm aracı da aynı
 * çapayı istiyor ve `getPlacementPosition`la aynı gerekçe geçerli — iki yerde
 * yaşasaydı biri değiştiğinde diğerinden ayrışırdı (K80).
 */
export function getSegmentNormal(from: PlanPoint, to: PlanPoint): PlanPoint {
  const lengthCm = getSegmentLength(from, to)
  if (lengthCm === 0) return { x: 0, y: 0 }

  // İşaret çevirme -0 üretir; koordinatlarda -0 dolaşırsa karşılaştırmalar şaşar.
  return {
    x: normalizeZero(-(to.y - from.y) / lengthCm),
    y: normalizeZero((to.x - from.x) / lengthCm),
  }
}

/**
 * Ölçü yazısının duracağı yer: bölümün orta noktası, dikinde `offsetCm` kadar
 * kaydırılmış hâli. Kaydırma miktarı ÇAĞIRANDAN gelir çünkü ekran pikselinden
 * türer (px/zoom) ve core zoom'u tanımaz.
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
