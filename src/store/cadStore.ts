import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { createArchitectureSlice, type ArchitectureSlice } from './architectureSlice'
import { createFloorSlice, type FloorSlice } from './floorSlice'
import { type ProjectMetaSlice } from './projectMeta'
import { FIRST_FREE_ID } from '../core/model'

export type CadState = ProjectMetaSlice & FloorSlice & ArchitectureSlice

// takeNextId/markDirty projectMeta.ts'te: slice'lar onları çalışma zamanında
// import ediyor, buradan alsalardı cadStore ↔ slice döngüsü oluşurdu.
export { markDirty, takeNextId } from './projectMeta'

export const useCadStore = create<CadState>()(
  immer((...args) => {
    const [set] = args
    return {
      nextUniqueId: FIRST_FREE_ID,
      revision: 0,
      savedRevision: 0,

      markSaved: () =>
        set((draft) => {
          draft.savedRevision = draft.revision
        }),

      ...createFloorSlice(...args),
      ...createArchitectureSlice(...args),
    }
  }),
)

/** Kaydedilmemiş değişiklik var mı? (issue 2.9 "kirli işaret sözleşmesi") */
export function selectIsProjectDirty(state: CadState): boolean {
  return state.revision !== state.savedRevision
}
