import { pruneOpeningsInDraft } from './architectureOpeningOps'
import type { ProjectData } from '../core/model'
import { getSelectedIds, type Selection } from '../core/selection'
import { getOrphanPointIds } from '../core/wall'

type ArchitectureData = Pick<ProjectData, 'points' | 'walls' | 'openings'>

/**
 * Seçili nesnelerin tamamını TEK geçişte siler (KK-10/KK-11).
 *
 * Tek tek `deleteWall`/`removeOpening` çağrılsaydı her nesne kendi `set()`'ini
 * ve `markDirty`'sini yapardı: beş nesne seçip Delete'e basan kullanıcı beş kez
 * Ctrl+Z'ye basmak zorunda kalırdı.
 *
 * Sıra önemli: önce açıklıklar. Duvar silinince üstündeki açıklık zaten
 * düşüyor (K16); ters sırada seçili açıklığın id'si duvarıyla birlikte gitmiş
 * olur ve "kaç nesne silindi" sayısı yanlış çıkar.
 *
 * Çağıranın set()'i İÇİNDE çalışır. Değişiklik yoksa false döner.
 */
export function deleteSelectionFromDraft(
  draft: ArchitectureData,
  selection: Selection,
): boolean {
  const openingIds = new Set(getSelectedIds(selection, 'opening'))
  const wallIds = new Set(getSelectedIds(selection, 'wall'))
  if (openingIds.size === 0 && wallIds.size === 0) return false

  const remainingOpenings = draft.openings.filter((opening) => !openingIds.has(opening.id))
  const remainingWalls = draft.walls.filter((wall) => !wallIds.has(wall.id))

  const isChanged =
    remainingOpenings.length !== draft.openings.length ||
    remainingWalls.length !== draft.walls.length
  if (!isChanged) return false

  draft.openings = remainingOpenings
  draft.walls = remainingWalls

  // Duvarı gidince sahipsiz kalan köşe ve açıklıklar aynı adımda temizlenir.
  const orphanIds = new Set(getOrphanPointIds(draft.points, draft.walls))
  draft.points = draft.points.filter((point) => !orphanIds.has(point.id))
  pruneOpeningsInDraft(draft)

  return true
}
