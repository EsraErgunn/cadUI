import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import { cloneFloorArchitecture, isFloorEmpty } from '../core/floorClone'
import type { Id } from '../core/model'

export type CopyFloorInput = {
  sourceFloorId: Id
  targetFloorId: Id
  /** KK-14: mimari ve tesisat ayrı ayrı seçilebilir. */
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
}

export type CopyFloorActions = {
  /**
   * Bir katın çizimini BOŞ bir kata aktarır (KK-14, "kat çıkma"). Kopya tümüyle
   * yeni id alır. Reddedilirse false döner ve hiçbir şey değişmez — id bile
   * harcanmaz.
   */
  copyFloor: (input: CopyFloorInput) => boolean
}

/**
 * Kat yapısının toplu uygulanması (applyFloorPlan) da bunu çağırıyor: "kat ekle
 * → X'tan kopyalayarak" ile satır aksiyonundaki kopyalama AYNI klonlama yolundan
 * geçsin, id remap iki kez iki farklı şekilde yazılmasın.
 */
export function copyFloorContentInDraft(draft: CadState, input: CopyFloorInput): boolean {
  const { sourceFloorId, targetFloorId } = input
  if (sourceFloorId === targetFloorId) return false
  if (!input.isArchitectureIncluded && !input.isInstallationIncluded) return false

  const hasSource = draft.floors.some((floor) => floor.id === sourceFloorId)
  const hasTarget = draft.floors.some((floor) => floor.id === targetFloorId)
  if (!hasSource || !hasTarget) return false

  // Hedef DOLUYSA reddedilir: üzerine yazmak kullanıcının çizimini sessizce
  // siler, birleştirmek de iki kopuk çizim üretir (CLAUDE.md ürün kuralı).
  if (!isFloorEmpty(draft, targetFloorId)) return false

  let isChanged = false

  if (input.isArchitectureIncluded) {
    const clone = cloneFloorArchitecture(draft, sourceFloorId, targetFloorId, () =>
      takeNextId(draft),
    )
    if (clone.points.length > 0 || clone.symbols.length > 0) {
      draft.points.push(...clone.points)
      draft.walls.push(...clone.walls)
      draft.openings.push(...clone.openings)
      draft.rooms.push(...clone.rooms)
      draft.symbols.push(...clone.symbols)
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

export function createCopyFloorActions(set: DraftSetter): CopyFloorActions {
  return {
    copyFloor: (input) => {
      let isCopied = false
      set((draft) => {
        isCopied = copyFloorContentInDraft(draft, input)
        if (isCopied) markDirty(draft)
      })
      return isCopied
    },
  }
}
