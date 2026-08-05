import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { Id } from '../../core/model'
import type { PlanRect } from '../../core/selection'
import type { ClipboardEntry } from '../core/clipboard'
import { mergeElementIds, toggleElementId } from '../core/elementSelection'
import type { InstallationElementType } from '../core/symbolMetadata'

type PlumbingUiState = {
  selectedElementIds: Id[]
  setSelectedElements: (elementIds: readonly Id[]) => void
  addSelectedElements: (elementIds: readonly Id[]) => void
  toggleSelectedElement: (elementId: Id) => void
  clearSelection: () => void
  /** Sürüklenen seçim çerçevesi; null = çerçeve çizilmiyor. */
  marquee: PlanRect | null
  setMarquee: (rect: PlanRect | null) => void
  clipboard: ClipboardEntry[]
  /** Aynı panodan kaçıncı yapıştırma — kopyalar üst üste binmesin diye pay bundan gelir. */
  pasteStepCount: number
  copyToClipboard: (entries: readonly ClipboardEntry[]) => void
  advancePasteStep: () => void
  /** symbolLoader.ts'in doldurduğu asset hataları — sessiz catch yerine görünür durum. */
  assetErrors: Partial<Record<InstallationElementType, string>>
  setAssetError: (type: InstallationElementType, message: string) => void
}

/**
 * cadStore DIŞI geçici tesisat UI durumu: kaydedilmez, geçmişe girmez, markDirty
 * çağırmaz (uiStore ile aynı gerekçe — docs/kararlar.md K3/K6).
 *
 * Pano da burada: kes/kopyala/yapıştır arasındaki eleman kopyaları çizimin
 * parçası DEĞİL, oturum boyu süren bir ara bellek. cadStore'a konsaydı
 * kaydedilen JSON'a sızar ve Ctrl+Z panoyu da geri alırdı.
 *
 * TODO(tesisat): devam eden hat noktaları, hover'lanan port ve aktif ölçüm ilgili
 * aşamalarda buraya eklenecek; imleç konumu store'a değil useRef/useFrame'e yazılır.
 */
export const usePlumbingUiStore = create<PlumbingUiState>()(
  immer((set) => ({
    selectedElementIds: [],
    marquee: null,
    clipboard: [],
    pasteStepCount: 0,
    assetErrors: {},

    setSelectedElements: (elementIds) =>
      set((draft) => {
        draft.selectedElementIds = [...elementIds]
      }),

    addSelectedElements: (elementIds) =>
      set((draft) => {
        draft.selectedElementIds = mergeElementIds(draft.selectedElementIds, elementIds)
      }),

    toggleSelectedElement: (elementId) =>
      set((draft) => {
        draft.selectedElementIds = toggleElementId(draft.selectedElementIds, elementId)
      }),

    clearSelection: () =>
      set((draft) => {
        draft.selectedElementIds = []
      }),

    setMarquee: (rect) =>
      set((draft) => {
        draft.marquee = rect
      }),

    // Yeni kopyalama pay sayacını sıfırlar: pay, o panonun kaçıncı kez
    // yapıştırıldığını sayar, uygulama açıldığından beri kaç kopyalama olduğunu değil.
    copyToClipboard: (entries) =>
      set((draft) => {
        draft.clipboard = [...entries]
        draft.pasteStepCount = 0
      }),

    advancePasteStep: () =>
      set((draft) => {
        draft.pasteStepCount += 1
      }),

    setAssetError: (type, message) =>
      set((draft) => {
        draft.assetErrors[type] = message
      }),
  })),
)
