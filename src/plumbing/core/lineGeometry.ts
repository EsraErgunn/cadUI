import type { PlanPoint } from '../../core/coords'

/** Bir hat en az bir segment taşır; tek noktalı taslak kaydedilmez. */
export const MIN_LINE_POINT_COUNT = 2

export function getSegmentLengthCm(from: PlanPoint, to: PlanPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

/** Aynı yere ikinci tık sıfır boy segment üretirdi; nokta eklenmez (duvar aracıyla aynı kural). */
export function appendPoint(points: readonly PlanPoint[], point: PlanPoint): PlanPoint[] {
  const last = points[points.length - 1]
  if (last && last.x === point.x && last.y === point.y) return [...points]

  return [...points, point]
}

/** Tek noktalı taslakta boş dizi döner — çağıran taslağı tümüyle bırakır. */
export function removeLastPoint(points: readonly PlanPoint[]): PlanPoint[] {
  return points.slice(0, -1)
}

export function hasEnoughPoints(points: readonly PlanPoint[]): boolean {
  return points.length >= MIN_LINE_POINT_COUNT
}
