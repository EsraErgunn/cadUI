import type { PlanPoint } from '../../core/coords'

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
