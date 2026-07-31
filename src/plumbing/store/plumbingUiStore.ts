import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { Id } from '../../core/model'
import type { InstallationElementType } from '../core/symbolMetadata'

type PlumbingUiState = {
  selectedElementId: Id | null
  setSelectedElement: (elementId: Id | null) => void
  /** symbolLoader.ts'in doldurduğu asset hataları — sessiz catch yerine görünür durum. */
  assetErrors: Partial<Record<InstallationElementType, string>>
  setAssetError: (type: InstallationElementType, message: string) => void
}

/**
 * cadStore DIŞI geçici tesisat UI durumu: kaydedilmez, geçmişe girmez, markDirty
 * çağırmaz (uiStore ile aynı gerekçe — docs/kararlar.md K3/K6).
 * TODO(tesisat): devam eden hat noktaları, hover'lanan port ve aktif ölçüm ilgili
 * aşamalarda buraya eklenecek; imleç konumu store'a değil useRef/useFrame'e yazılır.
 */
export const usePlumbingUiStore = create<PlumbingUiState>()(
  immer((set) => ({
    selectedElementId: null,
    assetErrors: {},

    setSelectedElement: (elementId) =>
      set((draft) => {
        draft.selectedElementId = elementId
      }),

    setAssetError: (type, message) =>
      set((draft) => {
        draft.assetErrors[type] = message
      }),
  })),
)
