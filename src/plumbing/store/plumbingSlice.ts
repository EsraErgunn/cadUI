import type { StateCreator } from 'zustand'

import { recordPlumbingHistory, redoPlumbingHistory, undoPlumbingHistory } from './plumbingHistory'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
// cadStore ↔ plumbingSlice karşılıklı import eder; bu taraf tip-only olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz (K17).
import type { CadState } from '../../store/cadStore'
import { markDirty, takeNextId } from '../../store/projectMeta'
import type { InstallationElement } from '../core/installationModel'
import { DEFAULT_ELEMENT_ANGLE_DEG, DEFAULT_ELEMENT_SCALE } from '../core/placement'
import type { InstallationElementType } from '../core/symbolMetadata'

export type AddElementInput = {
  type: InstallationElementType
  position: PlanPoint
  angleDeg?: number
  scale?: number
}

export type PlumbingSlice = {
  installationElements: InstallationElement[]
  /** Kat aktif kattan alınır: eleman iki yerde tutulan bir floorId ile ayrışmasın. */
  addElement: (input: AddElementInput) => void
  removeElement: (elementId: Id) => void
  moveElement: (elementId: Id, position: PlanPoint) => void
  undoPlumbing: () => void
  redoPlumbing: () => void
}

export const INITIAL_PLUMBING_DATA: Pick<PlumbingSlice, 'installationElements'> = {
  installationElements: [],
}

export const createPlumbingSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  PlumbingSlice
> = (set, get) => {
  /** Değişimden SONRA aynalanır — zundo bir önceki aynayı geçmişe iter. */
  const record = () => recordPlumbingHistory(get().installationElements)

  const restore = (elements: InstallationElement[] | null) => {
    if (!elements) return
    set((draft) => {
      // Geçmişten geri yazma record() ÇAĞIRMAZ: undo yeni bir geçmiş adımı değildir.
      draft.installationElements = elements
      markDirty(draft)
    })
  }

  return {
    ...INITIAL_PLUMBING_DATA,

    // id üretimi + ekleme + kirli işaret TEK set() içinde: tek geçmiş adımı, tek Ctrl+Z.
    addElement: (input) => {
      set((draft) => {
        draft.installationElements.push({
          id: takeNextId(draft),
          floorId: draft.activeFloorId,
          type: input.type,
          position: input.position,
          angleDeg: input.angleDeg ?? DEFAULT_ELEMENT_ANGLE_DEG,
          scale: input.scale ?? DEFAULT_ELEMENT_SCALE,
        })
        markDirty(draft)
      })
      record()
    },

    removeElement: (elementId) => {
      let isRemoved = false

      set((draft) => {
        const index = draft.installationElements.findIndex(
          (element) => element.id === elementId,
        )
        if (index === -1) return

        draft.installationElements.splice(index, 1)
        // nextUniqueId geri alınmaz: id bir kez üretilir, asla yeniden kullanılmaz.
        markDirty(draft)
        isRemoved = true
      })

      if (isRemoved) record()
    },

    moveElement: (elementId, position) => {
      let isMoved = false

      set((draft) => {
        const element = draft.installationElements.find(
          (candidate) => candidate.id === elementId,
        )
        if (!element) return

        element.position = position
        markDirty(draft)
        isMoved = true
      })

      if (isMoved) record()
    },

    undoPlumbing: () => restore(undoPlumbingHistory()),
    redoPlumbing: () => restore(redoPlumbingHistory()),
  }
}
