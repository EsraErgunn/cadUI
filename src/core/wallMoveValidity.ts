import type { Id, Point, Wall } from './model'
import { getSegmentLength, MIN_WALL_LENGTH_CM, projectOntoSegment } from './wall'
import { planWallOffset } from './wallOffset'

/** Kayan nokta payı; snap noktaları zaten hizaya koyuyor. */
const EPSILON = 1e-6

/** Simülasyon klonlarının id'si: gerçek id'ler POZİTİF artan tamsayı (KK-6). */
export function movedCornerCloneId(pointId: Id): Id {
  return -pointId
}

export type MovedDrawing = {
  points: Point[]
  walls: Wall[]
}

/**
 * Öteleme uygulanmış çizim: kopma + kaydırma birlikte, HİÇBİR ŞEY YAZMADAN.
 *
 * Hem sürükleme önizlemesi (`useArchitectureDraft`) hem geçerlilik denetimi
 * (`findWallMoveBlocker`) buradan geçer; store yazımı da aynı planı
 * (`planWallOffset`) kullanır. Üçü ayrı hesaplasaydı ekranda görülen, reddedilen
 * ve yazılan geometri birbirini tutmazdı.
 */
export function applyWallMove(
  walls: readonly Wall[],
  points: readonly Point[],
  wallId: Id,
  dxCm: number,
  dyCm: number,
  floorId: Id,
): MovedDrawing {
  const plan = planWallOffset(walls, points, wallId, dxCm, dyCm, floorId)
  if (!plan) return { points: [...points], walls: [...walls] }

  const wall = walls.find((candidate) => candidate.id === wallId)
  if (!wall) return { points: [...points], walls: [...walls] }

  const cloneSourceByWallId = new Map<Id, Id>()
  for (const detachment of plan.detachments) {
    for (const detachedId of detachment.wallIds) {
      cloneSourceByWallId.set(detachedId, detachment.pointId)
    }
  }

  const movedWalls = walls.map((candidate) => {
    const source = cloneSourceByWallId.get(candidate.id)
    if (source === undefined) return candidate

    return {
      ...candidate,
      p1Id: candidate.p1Id === source ? movedCornerCloneId(source) : candidate.p1Id,
      p2Id: candidate.p2Id === source ? movedCornerCloneId(source) : candidate.p2Id,
    }
  })

  const movedPoints = points.map((point) => {
    if (point.id === wall.p1Id) return { ...point, x: plan.p1.x, y: plan.p1.y }
    if (point.id === wall.p2Id) return { ...point, x: plan.p2.x, y: plan.p2.y }
    return point
  })

  // Klonlar ÖZGÜN koordinatta: kopan duvarlar oraya bağlı kalıyor.
  const clones = plan.detachments.flatMap((detachment) => {
    const corner = points.find((point) => point.id === detachment.pointId)
    return corner ? [{ ...corner, id: movedCornerCloneId(detachment.pointId) }] : []
  })

  return { points: [...movedPoints, ...clones], walls: movedWalls }
}

/** Taşımanın neden reddedildiği; `undefined` ise taşıma geçerli. */
export type WallMoveBlocker = 'freeEnd' | 'collapse'

function findLength(state: MovedDrawing, wall: Wall): number | undefined {
  const p1 = state.points.find((point) => point.id === wall.p1Id)
  const p2 = state.points.find((point) => point.id === wall.p2Id)
  return p1 && p2 ? getSegmentLength(p1, p2) : undefined
}

/** Uç başka bir duvarın ucuna ya da GÖVDESİNE değiyor mu? (K24 orada T kurar) */
function isEndAttached(
  walls: readonly Wall[],
  pointById: ReadonlyMap<Id, Point>,
  wallId: Id,
  endId: Id,
  end: Point,
  floorId: Id,
): boolean {
  return walls.some((other) => {
    if (other.id === wallId || other.floorId !== floorId) return false
    if (other.p1Id === endId || other.p2Id === endId) return true

    const p1 = pointById.get(other.p1Id)
    const p2 = pointById.get(other.p2Id)
    if (!p1 || !p2) return false
    if (getSegmentLength(p1, p2) < MIN_WALL_LENGTH_CM) return false

    return projectOntoSegment(p1, p2, end).distanceCm < MIN_WALL_LENGTH_CM
  })
}

/**
 * Taşıma çizimi bozacak mı? Geçersiz yerleştirme REDDEDİLİR (K13 deseni, K102).
 *
 * Paralel kaydırma modelinde komşular kesişime oturarak takip ettiği için kopma
 * artık nadir; geriye iki gerçek bozulma kalıyor:
 * - `freeEnd`: taşınan duvarın bir ucu hiçbir duvara değmiyor. Ucun tutunacağı
 *   komşu yoksa (hepsi duvara paralel, yani kolineer) duvar serbest kalır.
 * - `collapse`: bir duvar çizilemeyecek kadar kısalıyor. Duvarı komşusunun üstüne
 *   itmek sıfır boylu duvarlar ve üst üste binen kopyalar üretiyor; oda çevrimi
 *   kopuyor, yan odalar dolgusu ve etiketiyle birlikte kayboluyordu.
 *
 * ⚠️ İki denetim de "ÖNCEDEN de böyleydi" durumunu geçirir: yarım kalmış zinciri
 * ya da zaten güdük bir duvarı taşımak yasaklanmamalı. Kural YENİ bir bozulma
 * yaratmayı engelliyor, var olanı düzeltmeyi değil.
 */
export function findWallMoveBlocker(
  walls: readonly Wall[],
  points: readonly Point[],
  wallId: Id,
  dxCm: number,
  dyCm: number,
  floorId: Id,
): WallMoveBlocker | undefined {
  if (Math.abs(dxCm) < EPSILON && Math.abs(dyCm) < EPSILON) return undefined

  const before: MovedDrawing = { points: [...points], walls: [...walls] }
  const after = applyWallMove(walls, points, wallId, dxCm, dyCm, floorId)

  for (const wall of after.walls) {
    if (wall.floorId !== floorId) continue

    const lengthCm = findLength(after, wall)
    if (lengthCm === undefined || lengthCm >= MIN_WALL_LENGTH_CM) continue

    const source = before.walls.find((candidate) => candidate.id === wall.id)
    const wasShort = source ? (findLength(before, source) ?? 0) < MIN_WALL_LENGTH_CM : false
    if (!wasShort) return 'collapse'
  }

  const afterIndex = new Map(after.points.map((point) => [point.id, point]))
  const beforeIndex = new Map(before.points.map((point) => [point.id, point]))
  const moved = after.walls.find((candidate) => candidate.id === wallId)
  const source = before.walls.find((candidate) => candidate.id === wallId)
  if (!moved || !source || moved.floorId !== floorId) return undefined

  for (const endId of [moved.p1Id, moved.p2Id]) {
    const end = afterIndex.get(endId)
    if (!end) continue
    if (isEndAttached(after.walls, afterIndex, wallId, endId, end, floorId)) continue

    const beforeEnd = beforeIndex.get(endId)
    const wasFree =
      !beforeEnd || !isEndAttached(before.walls, beforeIndex, wallId, endId, beforeEnd, floorId)
    if (!wasFree) return 'freeEnd'
  }

  return undefined
}
