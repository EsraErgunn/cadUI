import type { StateCreator } from 'zustand'

// cadStore ↔ floorSlice karşılıklı import eder; bu taraf tip-only olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz.
import type { CadState } from './cadStore'
import { createCopyFloorActions, type CopyFloorActions } from './floorCloneOps'
import {
  appendFloor,
  moveFloorInDraft,
  removeFloorFromDraft,
  renameFloorInDraft,
  type AddFloorInput,
} from './floorOps'
import { markDirty } from './projectMeta'
import type { FloorDirection } from '../core/floors'
import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME, type Floor, type Id } from '../core/model'

export type FloorSlice = CopyFloorActions & {
  floors: Floor[]
  activeFloorId: Id
  /** Reddedilirse undefined döner ve HİÇBİR ŞEY değişmez — id bile harcanmaz. */
  addFloor: (input?: AddFloorInput) => Id | undefined
  /** Boş ya da başka katta kullanılan ad reddedilir. */
  renameFloor: (floorId: Id, name: string) => boolean
  /** Katın duvar/nokta/açıklık ve tesisat elemanları da silinir — TEK geri alma adımı. */
  removeFloor: (floorId: Id) => boolean
  moveFloor: (floorId: Id, direction: FloorDirection) => boolean
  setActiveFloor: (floorId: Id) => void
}

export const createFloorSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  FloorSlice
> = (set) => ({
  ...createCopyFloorActions(set),

  floors: [{ id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME }],
  activeFloorId: DEFAULT_FLOOR_ID,

  // Reddedilen işlemler markDirty ÇAĞIRMAZ: kaydedilmemiş değişiklik göstergesi
  // hiçbir şeyin değişmediği bir denemeyle yanmasın.
  addFloor: (input = {}) => {
    let addedId: Id | undefined
    set((draft) => {
      addedId = appendFloor(draft, input)
      if (addedId !== undefined) markDirty(draft)
    })
    return addedId
  },

  renameFloor: (floorId, name) => {
    let isRenamed = false
    set((draft) => {
      isRenamed = renameFloorInDraft(draft, floorId, name)
      if (isRenamed) markDirty(draft)
    })
    return isRenamed
  },

  removeFloor: (floorId) => {
    let isRemoved = false
    set((draft) => {
      isRemoved = removeFloorFromDraft(draft, floorId)
      if (isRemoved) markDirty(draft)
    })
    return isRemoved
  },

  moveFloor: (floorId, direction) => {
    let isMoved = false
    set((draft) => {
      isMoved = moveFloorInDraft(draft, floorId, direction)
      if (isMoved) markDirty(draft)
    })
    return isMoved
  },

  /**
   * Kat geçişi çizim VERİSİNİ değiştirmez, bu yüzden markDirty çağırmaz: sekmeye
   * tıklamak projeyi kaydedilmemiş göstermemeli. Yine de cadStore'da durur çünkü
   * activeFloorId kaydedilen JSON'un parçası (ProjectData).
   */
  setActiveFloor: (floorId) =>
    set((draft) => {
      if (!draft.floors.some((floor) => floor.id === floorId)) return
      draft.activeFloorId = floorId
    }),
})

export function selectActiveFloor(state: FloorSlice): Floor | undefined {
  return state.floors.find((floor) => floor.id === state.activeFloorId)
}
