import type { PlanPoint } from '../../core/coords'

const DEG_TO_RAD = Math.PI / 180

/**
 * anchor'dan cursor'a giden yönü, `baseAngleDeg` ekseniyle ona DİK eksenden
 * hangisine daha yakınsa o eksene izdüşürür — iki aday arasından seçim
 * cursor'ın adaya olan DİK uzaklığı en küçük olanla yapılır (klasik "ortho
 * lock": iki dik eksenden biri, üçüncü bir açı asla üretilmez).
 *
 * KİLİTSİZ: her çağrı bağımsızdır, önceki karar hatırlanmaz — kullanıcı
 * isteği (2026-08): "hiçbir zaman tek eksene yapışmasın", hangi eksenin
 * kullanılacağı HER karede imlece göre yeniden seçilir. Yalnız `wallSnap.ts`
 * duvara yakınken (bir duvar bulunduğunda) çağrılır; duvar yokken boru
 * tamamen serbesttir (`useLineTool.ts`), bu fonksiyona hiç uğramaz.
 */
export function projectOntoClosestOrthogonalAxis(
  baseAngleDeg: number,
  anchor: PlanPoint,
  cursor: PlanPoint,
): PlanPoint {
  let best: PlanPoint = anchor
  let bestDistanceSqCm = Number.POSITIVE_INFINITY

  for (const angleDeg of [baseAngleDeg, baseAngleDeg + 90]) {
    const rad = angleDeg * DEG_TO_RAD
    const dirX = Math.cos(rad)
    const dirY = Math.sin(rad)
    const alongCm = (cursor.x - anchor.x) * dirX + (cursor.y - anchor.y) * dirY
    const x = anchor.x + dirX * alongCm
    const y = anchor.y + dirY * alongCm
    const dx = cursor.x - x
    const dy = cursor.y - y
    const distanceSqCm = dx * dx + dy * dy
    if (distanceSqCm < bestDistanceSqCm) {
      bestDistanceSqCm = distanceSqCm
      best = { x, y }
    }
  }

  return best
}
