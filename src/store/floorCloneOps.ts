import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { removeFloorArchitectureInDraft, removeFloorInstallationInDraft } from './floorOps'
import { markDirty, takeNextId } from './projectMeta'
import { cloneFloorArchitecture } from '../core/floorClone'
import { planFloorCopy, type FloorCopySelection } from '../core/floorCopyPlan'
import type { Id } from '../core/model'

export type CopyFloorInput = {
  sourceFloorId: Id
  targetFloorId: Id
  /** Madde 16: mimari ve tesisat ayrı ayrı seçilebilir. */
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
}

export type CopyFloorActions = {
  /**
   * Bir katın çizimini seçilen katlara aktarır (KK-15…KK-18). Hedefte içerik
   * varsa ne olacağını `mode` söyler; kural core/floorCopyPlan.ts'te.
   *
   * Bütün hedefler TEK `set` çağrısında işlenir: kat başına ayrı action olsaydı
   * üç kata kopyalama üç Ctrl+Z isterdi (madde 19: "tek adımda geri alınır").
   *
   * Reddedilirse false döner ve hiçbir şey değişmez — id bile harcanmaz.
   */
  copyFloorToTargets: (selection: FloorCopySelection) => boolean
}

/**
 * Kopyayı hedefe yazar. Hedefin BOŞ olduğunu denetlemez: çağıran ya yeni (boş)
 * bir kata yazıyor ya da "üzerine yaz" kipinde hedefi zaten temizlemiş oluyor.
 * Denetim burada kalsaydı "yalnız tesisat kopyala" mimarisi olan bir hedefte
 * sebepsiz reddedilirdi.
 */
export function cloneFloorContentInDraft(draft: CadState, input: CopyFloorInput): boolean {
  const { sourceFloorId, targetFloorId } = input
  if (sourceFloorId === targetFloorId) return false

  let isChanged = false

  if (input.isArchitectureIncluded) {
    const clone = cloneFloorArchitecture(draft, sourceFloorId, targetFloorId, () =>
      takeNextId(draft),
    )
    if (
      clone.points.length > 0 ||
      clone.symbols.length > 0 ||
      clone.areaObjects.length > 0 ||
      clone.beams.length > 0
    ) {
      draft.points.push(...clone.points)
      draft.walls.push(...clone.walls)
      draft.openings.push(...clone.openings)
      draft.rooms.push(...clone.rooms)
      draft.symbols.push(...clone.symbols)
      draft.areaObjects.push(...clone.areaObjects)
      draft.beams.push(...clone.beams)
      isChanged = true
    }
  }

  if (input.isInstallationIncluded) {
    const sourceElements = draft.installationElements.filter(
      (element) => element.floorId === sourceFloorId,
    )
    for (const element of sourceElements) {
      draft.installationElements.push({
        ...element,
        id: takeNextId(draft),
        floorId: targetFloorId,
      })
    }
    if (sourceElements.length > 0) isChanged = true
  }

  return isChanged
}

function copyFloorToTargetsInDraft(draft: CadState, selection: FloorCopySelection): boolean {
  const plan = planFloorCopy(draft, draft.floors, selection)
  if (!plan.isRunnable) return false

  let isChanged = false
  for (const targetFloorId of plan.targetFloorIds) {
    // Önce AYNI TÜRDEN çizim silinir, sonra kaynağınki yazılır (madde 18).
    // "Atla" kipinde işlenen hedefte zaten çakışma yok, silme boşa çalışır.
    if (selection.isArchitectureIncluded) removeFloorArchitectureInDraft(draft, targetFloorId)
    if (selection.isInstallationIncluded) removeFloorInstallationInDraft(draft, targetFloorId)

    const isCopied = cloneFloorContentInDraft(draft, {
      sourceFloorId: selection.sourceFloorId,
      targetFloorId,
      isArchitectureIncluded: selection.isArchitectureIncluded,
      isInstallationIncluded: selection.isInstallationIncluded,
    })
    isChanged = isChanged || isCopied
  }

  return isChanged
}

export function createCopyFloorActions(set: DraftSetter): CopyFloorActions {
  return {
    copyFloorToTargets: (selection) => {
      let isCopied = false
      set((draft) => {
        isCopied = copyFloorToTargetsInDraft(draft, selection)
        if (isCopied) markDirty(draft)
      })
      return isCopied
    },
  }
}
