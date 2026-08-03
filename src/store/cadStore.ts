import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  createArchitectureSlice,
  deriveNextUniqueId,
  INITIAL_ARCHITECTURE_DATA,
  type ArchitectureSlice,
} from './architectureSlice'
import { createFloorSlice, type FloorSlice } from './floorSlice'
import type { ProjectMetaSlice } from './projectMeta'
import { createPlumbingSlice, type PlumbingSlice } from '../plumbing/store/plumbingSlice'

export type CadState = ProjectMetaSlice & FloorSlice & ArchitectureSlice & PlumbingSlice

// takeNextId/markDirty projectMeta.ts'te: slice'lar onları çalışma zamanında
// import ediyor, buradan alsalardı cadStore ↔ slice döngüsü oluşurdu (K17).
export { markDirty, takeNextId } from './projectMeta'

export const useCadStore = create<CadState>()(
  immer((...args) => {
    const [set] = args
    return {
      // Sayaç başlangıç verisinden TÜRETİLİR, sabit yazılmaz: veri bir gün boş
      // olmazsa sabit sayaç var olan bir id'yi ikinci kez üretir ve hata vermez.
      nextUniqueId: deriveNextUniqueId(INITIAL_ARCHITECTURE_DATA),
      revision: 0,
      savedRevision: 0,

      markSaved: () =>
        set((draft) => {
          draft.savedRevision = draft.revision
        }),

      ...createFloorSlice(...args),
      ...createArchitectureSlice(...args),
      ...createPlumbingSlice(...args),
    }
  }),
)

/**
 * Kaydedilmemiş değişiklik var mı? (issue 2.9 "kirli işaret sözleşmesi")
 * Duvar ve açıklık action'ları markDirty'yi çağırıyor; gerçekten true dönebilir.
 */
export function selectIsProjectDirty(state: CadState): boolean {
  return state.revision !== state.savedRevision
}
