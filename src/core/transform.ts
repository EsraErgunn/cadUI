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
  /**
   * Kullanıcının ÇİZDİĞİ eksene göre aynalama: `origin`den geçen, `angleDeg`
   * eğimindeki doğru. `mirror`ı GENELLER — 0° yatay aynanın, 90° dikey aynanın
   * ta kendisi. İkisi yine de ayrı duruyor: paneldeki iki düğme "seçimin kendi
   * merkezine göre" çalışıyor ve dayanağı sınır kutusundan alıyor, buradaki
   * eksen ise kullanıcının koyduğu bağımsız bir doğru.
   */
  | { kind: 'mirrorLine'; origin: PlanPoint; angleDeg: number }

/**
 * Çeyrek dönüş katlarında TAM değer döndüren trigonometri.
 *
 * `Math.cos(Math.PI)` −1 verse de `Math.sin(Math.PI)` 1.22e-16 veriyor; dikey
 * eksende aynalanan bir nokta bu yüzden 240 yerine 240.00000000000003 çıkıyordu
 * (testte yakalandı). Artık iki yol — panelin `mirror`ı ve tuvalde çizilen
 * `mirrorLine` — aynı eksende BİREBİR aynı sayıyı üretiyor; üstelik "iki kez
 * aynala = başa dön" da tam sağlanıyor.
 *
 * `rotate` bilerek DOKUNULMADI: o kod uzun süredir kullanımda ve bu dalın konusu
 * değil — aynı düzeltme gerekirse ayrı bir iş.
 */
function cosDeg(angleDeg: number): number {
  const normalized = ((angleDeg % 360) + 360) % 360
  if (normalized === 0) return 1
  if (normalized === 90 || normalized === 270) return 0
  if (normalized === 180) return -1
  return Math.cos(normalized * RAD_PER_DEG)
}

function sinDeg(angleDeg: number): number {
  const normalized = ((angleDeg % 360) + 360) % 360
  if (normalized === 0 || normalized === 180) return 0
  if (normalized === 90) return 1
  if (normalized === 270) return -1
  return Math.sin(normalized * RAD_PER_DEG)
}

export function applyTransform(point: PlanPoint, transform: PlanTransform): PlanPoint {
  if (transform.kind === 'translate') {
    return {
      x: normalizeZero(point.x + transform.dxCm),
      y: normalizeZero(point.y + transform.dyCm),
    }
  }

  if (transform.kind === 'mirrorLine') {
    // Doğruya göre yansıma: fark vektörü, doğrunun İKİ KATI açısıyla döndürülüp
    // dik bileşeni çevrilir. 0°'de y, 90°'de x işaret değiştirir — yani `mirror`
    // ile birebir aynı sonuç, yalnız eksen serbest.
    const dx = point.x - transform.origin.x
    const dy = point.y - transform.origin.y
    const doubled = 2 * transform.angleDeg
    const cos = cosDeg(doubled)
    const sin = sinDeg(doubled)

    return {
      x: normalizeZero(transform.origin.x + dx * cos + dy * sin),
      y: normalizeZero(transform.origin.y + dx * sin - dy * cos),
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
/**
 * Açıyı 0-359 aralığına indirger. Yakalama KAPALIYKEN de gerekli: -30 ile 330
 * aynı açı, ikisi ayrı değer olarak saklanırsa panel farklı sayı gösterir ve
 * "değişti mi" karşılaştırmaları boşuna true döner.
 */
export function normalizeAngleDeg(angleDeg: number): number {
  return normalizeZero(((angleDeg % 360) + 360) % 360)
}

export function snapAngleDeg(angleDeg: number, stepDeg: number = ROTATION_STEP_DEG): number {
  if (stepDeg <= 0) return angleDeg
  return normalizeAngleDeg(Math.round(angleDeg / stepDeg) * stepDeg)
}

/**
 * Dönüşümün bir nesnenin KENDİ açısına etkisi. Konum dönüşümüyle birlikte
 * uygulanmazsa 90° dönen bir grubun içindeki sembol yerinde döner ama dik kalır.
 *
 * Aynalama açıyı da yansıtır: yatay aynada (y çevrilir) açı işaret değiştirir,
 * dikey aynada (x çevrilir) 180°'den çıkarılır. Öteleme açıya dokunmaz.
 *
 * Serbest eksende (`mirrorLine`) kural genel hâliyle `2θ − açı`; θ = 0 verince
 * `−açı`, θ = 90 verince `180 − açı` çıkıyor, yani yukarıdaki iki özel durumla
 * BİREBİR aynı.
 */
export function applyTransformToAngleDeg(angleDeg: number, transform: PlanTransform): number {
  if (transform.kind === 'translate') return angleDeg

  const next = getMirroredOrRotatedAngleDeg(angleDeg, transform)
  return normalizeZero(((next % 360) + 360) % 360)
}

function getMirroredOrRotatedAngleDeg(
  angleDeg: number,
  transform: Exclude<PlanTransform, { kind: 'translate' }>,
): number {
  if (transform.kind === 'rotate') return angleDeg + transform.angleDeg
  if (transform.kind === 'mirrorLine') return 2 * transform.angleDeg - angleDeg
  return transform.axis === 'horizontal' ? -angleDeg : 180 - angleDeg
}
