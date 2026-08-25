import type { PlanPoint, ThreePosition } from '../../core/coords'

/**
 * Bu uzunluğun altındaki izdüşüm yönü eksen SAYILMAZ: kameraya tam dik duran
 * bir segment ekranda tek noktaya çöker ve yönü tanımsız kalır.
 */
const MIN_AXIS_LENGTH_CM = 0.001

export type IsometricDragAxis = {
  /**
   * Ekseni tanımlayan komşu köşenin dizini. Bu köşe SABİT kalan tarafı
   * gösterir: çekilen parça uzar, karşı uçtaki ağ yerinde durur.
   */
  neighborIndex: number
  /** İzdüşüm düzleminde birim yön. */
  direction: PlanPoint
}

function toUnitDirection(from: PlanPoint, to: PlanPoint): PlanPoint | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length < MIN_AXIS_LENGTH_CM) return null
  return { x: dx / length, y: dy / length }
}

/**
 * Bir köşeye komşu boru parçalarının İZDÜŞÜM düzlemindeki birim yönleri.
 * Köşede iki parça birleşiyorsa iki yön döner — kullanıcı hangisine doğru
 * çekerse o eksene kilitlenir.
 *
 * Yön 3B'den değil İZDÜŞÜMDEN okunur: sürükleme ekranda oluyor ve kayma da
 * izdüşüm düzleminde saklanıyor (`isometricOffsetCm`). 3B eksen alınıp sonra
 * izdüşürülseydi aynı sonuç çıkardı ama iki dönüşüm arasında kalan yuvarlama
 * borunun ucunu eksenden kaydırırdı.
 */
export function getIsometricDragAxes(
  positions: readonly ThreePosition[],
  pointIndex: number,
  project: (position: ThreePosition) => PlanPoint,
): IsometricDragAxis[] {
  const current = positions[pointIndex]
  if (!current) return []

  const at = project(current)
  const axes: IsometricDragAxis[] = []

  for (const neighborIndex of [pointIndex - 1, pointIndex + 1]) {
    const neighbor = positions[neighborIndex]
    if (!neighbor) continue

    const direction = toUnitDirection(at, project(neighbor))
    if (direction) axes.push({ neighborIndex, direction })
  }

  return axes
}

/**
 * Çekme yönüne EN YAKIN eksen (kullanıcı isteği, 2026-08: "borular kafasına
 * göre değil, hangi eksendeyse o tarafa gitsin"). Serbest sürüklemede
 * kullanıcı yatay bir boruyu eğik bir yere bırakabiliyordu ve izometrik şema
 * teknik çizim olmaktan çıkıyordu.
 *
 * İki parçanın birleştiği köşede iki aday vardır; kullanıcı hangi tarafa
 * çekmeye başladıysa niyeti odur. Eksen yoksa (parça ekranda tek noktaya
 * çöküyorsa) `null` döner ve çağıran kilitlemeden geçer.
 */
export function pickIsometricDragAxis(
  deltaCm: PlanPoint,
  axes: readonly IsometricDragAxis[],
): IsometricDragAxis | null {
  let best: IsometricDragAxis | null = null
  let bestProjection = 0

  for (const axis of axes) {
    const projection = deltaCm.x * axis.direction.x + deltaCm.y * axis.direction.y
    if (best === null || Math.abs(projection) > Math.abs(bestProjection)) {
      best = axis
      bestProjection = projection
    }
  }
  return best
}

/** Vektörün eksen üzerindeki bileşeni — dike düşen kısım ATILIR. */
export function projectDragOntoAxis(deltaCm: PlanPoint, axis: IsometricDragAxis): PlanPoint {
  const length = deltaCm.x * axis.direction.x + deltaCm.y * axis.direction.y
  return { x: axis.direction.x * length, y: axis.direction.y * length }
}
