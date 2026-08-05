import type { PlanPoint } from './coords'

const CM2_PER_M2 = 10_000

/** Poligonun alan ağırlıklı ağırlık merkezi. */
function getCentroid(corners: readonly PlanPoint[]): PlanPoint {
  let areaSum = 0
  let xSum = 0
  let ySum = 0

  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index]
    const next = corners[(index + 1) % corners.length]
    const cross = current.x * next.y - next.x * current.y

    areaSum += cross
    xSum += (current.x + next.x) * cross
    ySum += (current.y + next.y) * cross
  }

  // Çökmüş poligonda ağırlık merkezi tanımsız; köşe ortalamasına düş.
  if (Math.abs(areaSum) < Number.EPSILON) {
    const total = corners.reduce(
      (sum, corner) => ({ x: sum.x + corner.x, y: sum.y + corner.y }),
      { x: 0, y: 0 },
    )
    return { x: total.x / corners.length, y: total.y / corners.length }
  }

  return { x: xSum / (3 * areaSum), y: ySum / (3 * areaSum) }
}

/** Işın atma: kenarların kaç kez geçildiği tek sayıysa nokta içeridedir. */
export function isPointInsidePolygon(target: PlanPoint, corners: readonly PlanPoint[]): boolean {
  let isInside = false

  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index]
    const previous = corners[(index - 1 + corners.length) % corners.length]

    const isCrossingY = current.y > target.y !== previous.y > target.y
    if (!isCrossingY) continue

    const crossingX =
      ((previous.x - current.x) * (target.y - current.y)) / (previous.y - current.y) + current.x
    if (target.x < crossingX) isInside = !isInside
  }

  return isInside
}

/** Noktanın doğru parçasına en kısa uzaklığı. */
function getDistanceToSegment(target: PlanPoint, from: PlanPoint, to: PlanPoint): number {
  const edgeX = to.x - from.x
  const edgeY = to.y - from.y
  const lengthSquared = edgeX * edgeX + edgeY * edgeY
  if (lengthSquared === 0) return Math.hypot(target.x - from.x, target.y - from.y)

  // Parçanın DIŞINA taşan izdüşüm uca kelepçelenir; yoksa uzaklık olduğundan küçük çıkar.
  const projection = ((target.x - from.x) * edgeX + (target.y - from.y) * edgeY) / lengthSquared
  const clamped = Math.min(1, Math.max(0, projection))

  return Math.hypot(target.x - (from.x + edgeX * clamped), target.y - (from.y + edgeY * clamped))
}

/** Duvara uzaklık; nokta dışarıdaysa negatif. Büyük değer = etiket için ferah yer. */
function getClearance(target: PlanPoint, corners: readonly PlanPoint[]): number {
  let nearest = Infinity
  for (let index = 0; index < corners.length; index += 1) {
    const from = corners[index]
    const to = corners[(index + 1) % corners.length]
    nearest = Math.min(nearest, getDistanceToSegment(target, from, to))
  }

  return isPointInsidePolygon(target, corners) ? nearest : -nearest
}

/** Kaba tarama ızgarası; oda ölçeğinde en dar kolu bile yakalamaya yeter. */
const ANCHOR_SCAN_STEPS = 24
/** Yerel arama bu adıma inince durur (cm). Daha incesi ekranda fark etmez. */
const ANCHOR_REFINE_TOLERANCE_CM = 1

/**
 * Etiketin yazılacağı nokta: odanın DUVARLARINDAN EN UZAK noktası (en büyük iç
 * çemberin merkezi). İçeride olması garanti.
 *
 * Ağırlık merkezi iki türlü yanılıyordu: L şeklinde odada iç köşenin boşluğuna,
 * yani odanın DIŞINA düşebiliyor; düşmediğinde bile o boşluğun hemen dibine
 * oturup iki satırlık etiketi duvarın üstüne taşırıyordu. En ferah nokta ikisini
 * birden çözüyor.
 *
 * Önce kaba ızgara taranır, sonra en iyi adayın çevresinde adım yarılanarak
 * yerel arama yapılır — dışbükey olmayan poligonda gradyan güvenilmez, kaba
 * tarama doğru kola girmeyi garanti eder.
 */
export function getRoomLabelAnchor(corners: readonly PlanPoint[]): PlanPoint {
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  let best = getCentroid(corners)
  let bestClearance = getClearance(best, corners)

  for (let row = 0; row <= ANCHOR_SCAN_STEPS; row += 1) {
    for (let column = 0; column <= ANCHOR_SCAN_STEPS; column += 1) {
      const candidate = {
        x: minX + ((maxX - minX) * column) / ANCHOR_SCAN_STEPS,
        y: minY + ((maxY - minY) * row) / ANCHOR_SCAN_STEPS,
      }
      const clearance = getClearance(candidate, corners)
      if (clearance > bestClearance) {
        best = candidate
        bestClearance = clearance
      }
    }
  }

  let step = Math.max(maxX - minX, maxY - minY) / ANCHOR_SCAN_STEPS
  while (step > ANCHOR_REFINE_TOLERANCE_CM) {
    for (const offsetX of [-step, 0, step]) {
      for (const offsetY of [-step, 0, step]) {
        const candidate = { x: best.x + offsetX, y: best.y + offsetY }
        const clearance = getClearance(candidate, corners)
        if (clearance > bestClearance) {
          best = candidate
          bestClearance = clearance
        }
      }
    }
    step /= 2
  }

  return best
}

/** Etiketin gösterdiği alan. Yuvarlama SUNUM işidir, modelde cm² tutulur. */
export function toSquareMetres(areaCm2: number): number {
  return areaCm2 / CM2_PER_M2
}
