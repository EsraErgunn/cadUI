import { normalizeZero, type PlanPoint } from './coords'
import type { PlanRect } from './selection'

const RAD_PER_DEG = Math.PI / 180

/** Serbest döndürme dışında açı bu adıma yakalanır (KK-11). */
export const ROTATION_STEP_DEG = 15

/** Panel/menüden verilen hazır dönüş. */
export const QUARTER_TURN_DEG = 90

/**
 * `axis` AYNANIN EKSENİ, yansımanın yönü değil: `horizontal` yatay bir aynadan
 * yansıtır, yani y işaret değiştirir. Karışması kolay olduğu için alan adı değil
 * bu yorum sözleşmedir.
 */
export type MirrorAxis = 'horizontal' | 'vertical'

export type PlanTransform =
  | { kind: 'translate'; dxCm: number; dyCm: number }
  | { kind: 'rotate'; pivot: PlanPoint; angleDeg: number }
  | { kind: 'mirror'; pivot: PlanPoint; axis: MirrorAxis }

export function applyTransform(point: PlanPoint, transform: PlanTransform): PlanPoint {
  if (transform.kind === 'translate') {
    return {
      x: normalizeZero(point.x + transform.dxCm),
      y: normalizeZero(point.y + transform.dyCm),
    }
  }

  const dx = point.x - transform.pivot.x
  const dy = point.y - transform.pivot.y

  if (transform.kind === 'mirror') {
    return {
      x: normalizeZero(transform.pivot.x + (transform.axis === 'vertical' ? -dx : dx)),
      y: normalizeZero(transform.pivot.y + (transform.axis === 'horizontal' ? -dy : dy)),
    }
  }

  const radians = transform.angleDeg * RAD_PER_DEG
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: normalizeZero(transform.pivot.x + dx * cos - dy * sin),
    y: normalizeZero(transform.pivot.y + dx * sin + dy * cos),
  }
}

/** Boş küme için undefined: sıfır alanlı bir kutu, merkezi (0,0) olan gerçek bir kutuyla karışır. */
export function getPointsBounds(points: readonly PlanPoint[]): PlanRect | undefined {
  if (points.length === 0) return undefined

  let { x: minX, y: minY } = points[0]
  let maxX = minX
  let maxY = minY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Döndürme ve aynalamanın dayanağı seçimin SINIR KUTUSU merkezidir, nokta
 * ortalaması değil: ortalama, köşesi kalabalık bir seçimde kutunun dışına
 * kayabilir ve nesne kendi etrafında değil yandan dönüyormuş gibi görünür.
 */
export function getBoundsCenter(bounds: PlanRect): PlanPoint {
  return {
    x: normalizeZero((bounds.minX + bounds.maxX) / 2),
    y: normalizeZero((bounds.minY + bounds.maxY) / 2),
  }
}

export function getPointsCenter(points: readonly PlanPoint[]): PlanPoint | undefined {
  const bounds = getPointsBounds(points)
  return bounds ? getBoundsCenter(bounds) : undefined
}

/** Açıyı adıma yakalar ve [0, 360) aralığına indirir. */
export function snapAngleDeg(angleDeg: number, stepDeg: number = ROTATION_STEP_DEG): number {
  if (stepDeg <= 0) return angleDeg
  const snapped = Math.round(angleDeg / stepDeg) * stepDeg
  return normalizeZero(((snapped % 360) + 360) % 360)
}

/**
 * Dönüşümün bir nesnenin KENDİ açısına etkisi. Konum dönüşümüyle birlikte
 * uygulanmazsa 90° dönen bir grubun içindeki sembol yerinde döner ama dik kalır.
 *
 * Aynalama açıyı da yansıtır: yatay aynada (y çevrilir) açı işaret değiştirir,
 * dikey aynada (x çevrilir) 180°'den çıkarılır. Öteleme açıya dokunmaz.
 */
export function applyTransformToAngleDeg(angleDeg: number, transform: PlanTransform): number {
  if (transform.kind === 'translate') return angleDeg

  const next =
    transform.kind === 'rotate'
      ? angleDeg + transform.angleDeg
      : transform.axis === 'horizontal'
        ? -angleDeg
        : 180 - angleDeg

  return normalizeZero(((next % 360) + 360) % 360)
}
