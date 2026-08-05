import { pruneOpeningsInDraft } from './architectureOpeningOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty } from './projectMeta'
import type { Id, ProjectData } from '../core/model'
import { MIN_WALL_HEIGHT_CM, MIN_WALL_THICKNESS_CM } from '../core/propertyFields'

type ArchitectureData = Pick<ProjectData, 'points' | 'walls' | 'openings'>

/** Slice'ın immer setter'ı; action fabrikaları bunu alır. */
export type DraftSetter = (recipe: (draft: CadState) => void) => void

/**
 * Duvar kalınlığı köşe payını belirliyor (`getPlacementRange`, K11): kalınlaşan
 * duvar komşusundaki açıklığın yerleştirme aralığını daraltır. Bu yüzden
 * kalınlık yazımından sonra açıklık temizliği AYNI adımda çalışır (K16) —
 * sonradan çalıştırılsaydı sığmayan açıklık ayrı bir Ctrl+Z adımında düşerdi.
 *
 * Çağıranın set()'i İÇİNDE çalışır. Değişiklik yoksa false döner.
 */
export function setWallsThicknessInDraft(
  draft: ArchitectureData,
  wallIds: readonly Id[],
  thicknessCm: number,
): boolean {
  if (!Number.isFinite(thicknessCm) || thicknessCm < MIN_WALL_THICKNESS_CM) return false

  const targets = new Set(wallIds)
  let isChanged = false

  for (const wall of draft.walls) {
    if (!targets.has(wall.id) || wall.thickness === thicknessCm) continue
    wall.thickness = thicknessCm
    isChanged = true
  }

  if (!isChanged) return false

  pruneOpeningsInDraft(draft)
  return true
}

/** Yükseklik 2B planda çizilmiyor; açıklık sığmasını da etkilemez, temizlik gerekmez. */
export function setWallsHeightInDraft(
  draft: ArchitectureData,
  wallIds: readonly Id[],
  heightCm: number,
): boolean {
  if (!Number.isFinite(heightCm) || heightCm < MIN_WALL_HEIGHT_CM) return false

  const targets = new Set(wallIds)
  let isChanged = false

  for (const wall of draft.walls) {
    if (!targets.has(wall.id) || wall.height === heightCm) continue
    wall.height = heightCm
    isChanged = true
  }

  return isChanged
}

/**
 * Özellik panelinin yazım action'ları (KK-12). Gövdeler burada, slice'ta yalnız
 * tek satırlık delege duruyor — architectureWallOps/architectureOpeningOps ile
 * aynı desen, slice 200 satır sınırının altında kalıyor.
 */
export function createPropertyActions(set: DraftSetter) {
  const applyToDraft = (apply: (draft: CadState) => boolean): boolean => {
    let isApplied = false
    set((draft) => {
      isApplied = apply(draft)
      if (isApplied) markDirty(draft)
    })
    return isApplied
  }

  return {
    setWallsThickness: (wallIds: readonly Id[], thicknessCm: number) =>
      applyToDraft((draft) => setWallsThicknessInDraft(draft, wallIds, thicknessCm)),

    setWallsHeight: (wallIds: readonly Id[], heightCm: number) =>
      applyToDraft((draft) => setWallsHeightInDraft(draft, wallIds, heightCm)),
  }
}
