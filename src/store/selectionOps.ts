import { pruneOpeningsInDraft } from './architectureOpeningOps'
import type { DraftSetter } from './architecturePropertyOps'
import { recomputeRoomsInDraft } from './architectureRooms'
// cadStore ↔ store dosyaları karşılıklı import eder; bu taraf tip-only (K17).
import type { CadState } from './cadStore'
import { markDirty } from './projectMeta'
import { getSelectedIds, type Selection } from '../core/selection'
import { getOrphanPointIds } from '../core/wall'

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
 * Nokta sembolü kimseye bağlı değil (kendi koordinatını taşıyor), bu yüzden
 * sırası önemsiz ve silinmesi temizlik gerektirmiyor.
 *
 * Çağıranın set()'i İÇİNDE çalışır. Değişiklik yoksa false döner.
 */
export function deleteSelectionFromDraft(draft: CadState, selection: Selection): boolean {
  const openingIds = new Set(getSelectedIds(selection, 'opening'))
  const wallIds = new Set(getSelectedIds(selection, 'wall'))
  const symbolIds = new Set(getSelectedIds(selection, 'symbol'))
  if (openingIds.size === 0 && wallIds.size === 0 && symbolIds.size === 0) return false

  const remainingOpenings = draft.openings.filter((opening) => !openingIds.has(opening.id))
  const remainingWalls = draft.walls.filter((wall) => !wallIds.has(wall.id))
  const remainingSymbols = draft.symbols.filter((symbol) => !symbolIds.has(symbol.id))

  const isChanged =
    remainingOpenings.length !== draft.openings.length ||
    remainingWalls.length !== draft.walls.length ||
    remainingSymbols.length !== draft.symbols.length
  if (!isChanged) return false

  draft.openings = remainingOpenings
  draft.walls = remainingWalls
  draft.symbols = remainingSymbols

  // Duvarı gidince sahipsiz kalan köşe ve açıklıklar aynı adımda temizlenir.
  const orphanIds = new Set(getOrphanPointIds(draft.points, draft.walls))
  draft.points = draft.points.filter((point) => !orphanIds.has(point.id))
  pruneOpeningsInDraft(draft)
  // Duvar düşünce çevrim kopar: kapanmayan oda aynı adımda silinir (K31).
  // deleteWall'daki temizliğin aynısı — yoksa oda store'da hayalet olarak kalır.
  recomputeRoomsInDraft(draft)

  return true
}

export function createSelectionActions(set: DraftSetter) {
  return {
    deleteSelection: (selection: Selection): boolean => {
      let isDeleted = false
      set((draft) => {
        isDeleted = deleteSelectionFromDraft(draft, selection)
        if (isDeleted) markDirty(draft)
      })
      return isDeleted
    },
  }
}
