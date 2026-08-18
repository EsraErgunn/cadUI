// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { takeNextId } from './projectMeta'
import type { Id } from '../core/model'
import { planWallOffset } from '../core/wallOffset'

/**
 * Duvarı kendine PARALEL kaydırır; uçları komşularının doğrusuna oturur (K103).
 *
 * Kararın kendisi burada değil, `core/wallOffset.ts` → `planWallOffset`'ta:
 * sürükleme önizlemesi ve geçerlilik denetimi de aynı fonksiyondan geçiyor.
 * Burası yalnız uyguluyor.
 *
 * Sıra ÖNEMLİ: önce kopanlar köşenin klonuna bağlanır, SONRA köşe kendi yeni
 * konumuna taşınır. Ters sırada kopacak duvarlar da köşeyle birlikte sürüklenir.
 * Köşe ortak `Point` olduğu için, kalan komşular taşımayı kendiliğinden izler —
 * boyları değişir, açıları korunur.
 */
export function applyWallOffsetInDraft(
  draft: CadState,
  wallId: Id,
  dxCm: number,
  dyCm: number,
): boolean {
  const plan = planWallOffset(
    draft.walls,
    draft.points,
    wallId,
    dxCm,
    dyCm,
    draft.activeFloorId,
  )
  if (!plan) return false

  const wall = draft.walls.find((candidate) => candidate.id === wallId)
  if (!wall) return false

  for (const detachment of plan.detachments) {
    const corner = draft.points.find((point) => point.id === detachment.pointId)
    if (!corner) continue

    const clone = {
      id: takeNextId(draft),
      floorId: corner.floorId,
      x: corner.x,
      y: corner.y,
    }
    draft.points.push(clone)

    // Duvar kimliği korunuyor: üstündeki açıklıklar ve oda kimliği bozulmasın.
    const detachingIds = new Set(detachment.wallIds)
    for (const candidate of draft.walls) {
      if (!detachingIds.has(candidate.id)) continue
      if (candidate.p1Id === detachment.pointId) candidate.p1Id = clone.id
      if (candidate.p2Id === detachment.pointId) candidate.p2Id = clone.id
    }
  }

  let isChanged = false
  const place = (pointId: Id, target: { x: number; y: number }) => {
    const point = draft.points.find((candidate) => candidate.id === pointId)
    if (!point || (point.x === target.x && point.y === target.y)) return

    point.x = target.x
    point.y = target.y
    isChanged = true
  }
  place(wall.p1Id, plan.p1)
  place(wall.p2Id, plan.p2)

  return isChanged
}
