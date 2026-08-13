import type { PlanPoint } from './coords'
import { isPointInRect, type PlanRect } from './selection'

/**
 * Kılavuz çizgisi yazının ALTINDAN geçmesin: start→end parçası etiket kutusuna
 * girdiği noktada kesilir (slab yöntemi). Parça kutuya hiç girmiyorsa ya da
 * start zaten kutunun içindeyse kırpacak bir şey yoktur, `end` olduğu gibi döner.
 *
 * `core/` içinde duruyor çünkü hem tesisat elemanının hem mimari alan nesnesinin
 * ad etiketi aynı hesabı istiyor; `plumbing/core/` altında kalsaydı mimari taraf
 * onu import edemez (fay sınırı) ve ikinci bir kopya yazılırdı.
 */
export function clipLeaderEndToRectCm(
  start: PlanPoint,
  end: PlanPoint,
  rect: PlanRect,
): PlanPoint {
  if (isPointInRect(start, rect)) return end

  const dx = end.x - start.x
  const dy = end.y - start.y

  let tEnter = 0
  let tExit = 1
  const axes = [
    { delta: dx, origin: start.x, min: rect.minX, max: rect.maxX },
    { delta: dy, origin: start.y, min: rect.minY, max: rect.maxY },
  ]
  for (const axis of axes) {
    if (axis.delta === 0) {
      if (axis.origin < axis.min || axis.origin > axis.max) return end
      continue
    }
    const t1 = (axis.min - axis.origin) / axis.delta
    const t2 = (axis.max - axis.origin) / axis.delta
    tEnter = Math.max(tEnter, Math.min(t1, t2))
    tExit = Math.min(tExit, Math.max(t1, t2))
  }
  if (tEnter > tExit) return end

  return { x: start.x + dx * tEnter, y: start.y + dy * tEnter }
}
