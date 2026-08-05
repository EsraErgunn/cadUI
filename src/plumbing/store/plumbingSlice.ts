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
  /** Yapıştırmanın tek adımlık hâli; üretilen id'ler döner (kopya hemen seçilebilsin). */
  addElements: (inputs: readonly AddElementInput[]) => Id[]
  removeElements: (elementIds: readonly Id[]) => void
  /** Seçimin TAMAMI aynı kaymayla taşınır — tek geçmiş adımı, tek Ctrl+Z. */
  moveElements: (elementIds: readonly Id[], deltaCm: PlanPoint) => void
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

  /**
   * Tek yerde: hem tekil ekleme hem yapıştırma aynı varsayılanları kullansın.
   * Parametre yapısal Pick — immer draft'ı `CadState`'in kendisi değil `Draft`'ı.
   */
  const pushElement = (
    draft: Pick<CadState, 'installationElements' | 'activeFloorId' | 'nextUniqueId'>,
    input: AddElementInput,
  ): Id => {
    const id = takeNextId(draft)
    draft.installationElements.push({
      id,
      floorId: draft.activeFloorId,
      type: input.type,
      position: input.position,
      angleDeg: input.angleDeg ?? DEFAULT_ELEMENT_ANGLE_DEG,
      scale: input.scale ?? DEFAULT_ELEMENT_SCALE,
    })
    return id
  }

  return {
    ...INITIAL_PLUMBING_DATA,

    // id üretimi + ekleme + kirli işaret TEK set() içinde: tek geçmiş adımı, tek Ctrl+Z.
    addElement: (input) => {
      set((draft) => {
        pushElement(draft, input)
        markDirty(draft)
      })
      record()
    },

    addElements: (inputs) => {
      if (inputs.length === 0) return []

      const createdIds: Id[] = []
      set((draft) => {
        for (const input of inputs) {
          createdIds.push(pushElement(draft, input))
        }
        markDirty(draft)
      })
      record()
      return createdIds
    },

    removeElements: (elementIds) => {
      let isRemoved = false

      set((draft) => {
        const remaining = draft.installationElements.filter(
          (element) => !elementIds.includes(element.id),
        )
        if (remaining.length === draft.installationElements.length) return

        draft.installationElements = remaining
        // nextUniqueId geri alınmaz: id bir kez üretilir, asla yeniden kullanılmaz.
        markDirty(draft)
        isRemoved = true
      })

      if (isRemoved) record()
    },

    moveElements: (elementIds, deltaCm) => {
      let isMoved = false

      set((draft) => {
        for (const element of draft.installationElements) {
          if (!elementIds.includes(element.id)) continue

          element.position = {
            x: element.position.x + deltaCm.x,
            y: element.position.y + deltaCm.y,
          }
          isMoved = true
        }

        if (isMoved) markDirty(draft)
      })

      if (isMoved) record()
    },

    undoPlumbing: () => restore(undoPlumbingHistory()),
    redoPlumbing: () => restore(redoPlumbingHistory()),
  }
}
