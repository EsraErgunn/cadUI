import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { MOCK_NEXT_FREE_ID } from './architectureMock'
import { createArchitectureSlice, type ArchitectureSlice } from './architectureSlice'
import { createFloorSlice, type FloorSlice } from './floorSlice'
import type { ProjectMetaSlice } from './projectMeta'

export type CadState = ProjectMetaSlice & FloorSlice & ArchitectureSlice

// takeNextId/markDirty artık projectMeta.ts'te: veri slice'ları onları çalışma
// zamanında çağırıyor, buradan alsalardı import döngüsü oluşuyordu.
export { markDirty, takeNextId } from './projectMeta'

export const useCadStore = create<CadState>()(
  immer((...args) => {
    const [set] = args
    return {
      // Mock sahne id 12'ye kadar kullanıyor; sayaç elle yazılsaydı ilk
      // addOpening var olan bir id'yi ikinci kez üretirdi (architectureMock.ts).
      nextUniqueId: MOCK_NEXT_FREE_ID,
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

/**
 * Kaydedilmemiş değişiklik var mı? (issue 2.9 "kirli işaret sözleşmesi")
 * Açıklık action'ları markDirty'nin ilk çağıranı; artık gerçekten true dönebilir.
 */
export function selectIsProjectDirty(state: CadState): boolean {
  return state.revision !== state.savedRevision
}
