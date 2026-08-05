import type { PlanPoint } from './coords'

/** Bu değerin altındaki çapraz çarpım paralel sayılır; kesişim noktası patlar. */
const PARALLEL_EPSILON = 1e-9

function getSignedArea(corners: readonly PlanPoint[]): number {
  let total = 0
  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index]
    const next = corners[(index + 1) % corners.length]
    total += current.x * next.y - next.x * current.y
  }
  return total / 2
}

/**
 * Kenarları duvar kalınlığının yarısı kadar İÇERİ çekilmiş poligon.
 *
 * Dolgu duvarın altına girmesin diye gerekli: saydam nesneler three.js'te ayrı
 * geçişte ve opak duvarlardan SONRA çizilir, `renderOrder` yalnız kendi geçişi
 * içinde sıralar. Yani oda duvarla çakıştığı sürece onu boyar. Çözüm sıralama
 * değil, hiç değmemek (K31).
 *
 * `edgeThicknessesCm[i]`, `corners[i] → corners[i+1]` kenarını taşıyan duvarın
 * kalınlığı. Köşeler, komşu iki kenarın ötelenmiş DOĞRULARININ kesişimi olarak
 * bulunur — tek tek köşe ötelense kenarlar birbirinden kopardı.
 *
 * Oda kendi duvarlarından inceyse poligon ters döner; o durumda görünecek iç yüz
 * de yoktur, `undefined` döner.
 */
export function insetRoomPolygon(
  corners: readonly PlanPoint[],
  edgeThicknessesCm: readonly number[],
): PlanPoint[] | undefined {
  const count = corners.length
  if (count < 3 || edgeThicknessesCm.length !== count) return undefined

  // İç taraf yön bilgisi işaretten geliyor: saat yönünün tersinde iç, gidiş
  // yönünün SOLUDUR. Ters sıralı poligonda sol/sağ takas edilir.
  const inwardSign = getSignedArea(corners) >= 0 ? 1 : -1

  type OffsetLine = { origin: PlanPoint; dirX: number; dirY: number }
  const lines: OffsetLine[] = []

  for (let index = 0; index < count; index += 1) {
    const from = corners[index]
    const to = corners[(index + 1) % count]
    const dirX = to.x - from.x
    const dirY = to.y - from.y
    const length = Math.hypot(dirX, dirY)
    // Sıfır boy kenar yön tanımlamaz; ötelenecek bir doğrusu yok.
    if (length < PARALLEL_EPSILON) return undefined

    const shift = (edgeThicknessesCm[index] / 2) * inwardSign
    lines.push({
      origin: { x: from.x + (-dirY / length) * shift, y: from.y + (dirX / length) * shift },
      dirX,
      dirY,
    })
  }

  const inset: PlanPoint[] = []
  for (let index = 0; index < count; index += 1) {
    const previous = lines[(index - 1 + count) % count]
    const current = lines[index]

    const cross = previous.dirX * current.dirY - previous.dirY * current.dirX
    if (Math.abs(cross) < PARALLEL_EPSILON) {
      // Doğrusal devam eden iki kenar: ötelenmiş doğrular çakışır, köşe zaten
      // current'ın başlangıcıdır.
      inset.push({ x: current.origin.x, y: current.origin.y })
      continue
    }

    const deltaX = current.origin.x - previous.origin.x
    const deltaY = current.origin.y - previous.origin.y
    const t = (deltaX * current.dirY - deltaY * current.dirX) / cross

    inset.push({
      x: previous.origin.x + previous.dirX * t,
      y: previous.origin.y + previous.dirY * t,
    })
  }

  if (inset.some((corner) => !Number.isFinite(corner.x) || !Number.isFinite(corner.y))) {
    return undefined
  }
  // İşaret dönmüşse poligon kendi içine katlanmış demektir.
  if (Math.sign(getSignedArea(inset)) !== inwardSign) return undefined

  return inset
}

function getCross(origin: PlanPoint, a: PlanPoint, b: PlanPoint): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
}

function isPointInTriangle(
  target: PlanPoint,
  a: PlanPoint,
  b: PlanPoint,
  c: PlanPoint,
): boolean {
  const first = getCross(a, b, target)
  const second = getCross(b, c, target)
  const third = getCross(c, a, target)

  return first >= 0 && second >= 0 && third >= 0
}

/**
 * Poligonu üçgenlere ayırır (kulak kırpma), sonuç düzleştirilmiş köşe dizisidir:
 * her üç eleman bir üçgen.
 *
 * Üçgen yelpaze KULLANILAMAZ: yelpaze yalnız dışbükey poligonda doğrudur, L
 * şeklindeki odada iç köşeyi kesip taşan üçgenler üretir. Kulak kırpma yalnız
 * poligonun içinde kalan kulakları koparır, içbükeyde de doğru çalışır.
 */
export function triangulatePolygon(corners: readonly PlanPoint[]): PlanPoint[] {
  if (corners.length < 3) return []

  // Kulak testi saat yönünün tersine göre yazıldı; ters sıralı poligon çevrilir.
  const ordered = getSignedArea(corners) >= 0 ? [...corners] : [...corners].reverse()
  const remaining = ordered.map((_, index) => index)
  const triangles: PlanPoint[] = []

  while (remaining.length > 3) {
    let earIndex = -1

    for (let slot = 0; slot < remaining.length; slot += 1) {
      const previousSlot = (slot - 1 + remaining.length) % remaining.length
      const nextSlot = (slot + 1) % remaining.length
      const previous = ordered[remaining[previousSlot]]
      const current = ordered[remaining[slot]]
      const next = ordered[remaining[nextSlot]]

      // İçbükey (veya doğrusal) köşe kulak olamaz: kopardığı üçgen dışarı taşar.
      if (getCross(previous, current, next) <= 0) continue

      const hasTrappedCorner = remaining.some((cornerIndex, candidateSlot) => {
        if (candidateSlot === previousSlot || candidateSlot === slot || candidateSlot === nextSlot) {
          return false
        }
        return isPointInTriangle(ordered[cornerIndex], previous, current, next)
      })
      if (hasTrappedCorner) continue

      earIndex = slot
      break
    }

    // Kulak bulunamıyorsa poligon kendini kesiyor demektir; elde kalanı olduğu
    // gibi bırakıp çık, sonsuz döngüye girme.
    if (earIndex === -1) break

    const previous = ordered[remaining[(earIndex - 1 + remaining.length) % remaining.length]]
    const current = ordered[remaining[earIndex]]
    const next = ordered[remaining[(earIndex + 1) % remaining.length]]
    triangles.push(previous, current, next)
    remaining.splice(earIndex, 1)
  }

  if (remaining.length === 3) {
    triangles.push(ordered[remaining[0]], ordered[remaining[1]], ordered[remaining[2]])
  }

  return triangles
}
