import type { Id, Point, Wall } from './model'
import { planWallOffset } from './wallOffset'

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
 * Sürükleme önizlemesi (`useArchitectureDraft`) buradan geçer; store yazımı da
 * aynı planı (`planWallOffset`) kullanır. İkisi ayrı hesaplasaydı ekranda
 * görülen ile bırakınca yazılan geometri birbirini tutmazdı.
 *
 * ⚠️ Burada YALNIZ geometri var; kaynatma/birleştirme/oda hesabı YOK. Onlar
 * store katmanında (`store/architectureWallMoveValidity.ts` → boru hattı) ve
 * yalnız bırakış anında koşar. Önizlemede eksik olmaları görüntüyü bozmuyor:
 * sıfır boya inen duvar kapsül üretmediği için zaten çizilmiyor, yani ekranda
 * temizlik sonrası hâliyle aynı görünüyor.
 *
 * ⚠️ Bu yüzden BU çıktı geçerlilik kararına DAYANAK OLAMAZ: temizlik öncesi ara
 * durumu gösterir, store'un yazacağı hâli değil. Karar için store katmanındaki
 * `findWallMoveBlocker` kullanılır (K107).
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
