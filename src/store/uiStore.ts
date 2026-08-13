import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { DEFAULT_TOOL_ID, type ToolId } from '../core/tools'
import { DEFAULT_VIEW_ID, type ViewId } from '../core/views'
import {
  DEFAULT_INSTALLATION_TOOL_ID,
  type InstallationToolId,
} from '../plumbing/core/installationTools'

type UiState = {
  activeToolId: ToolId | InstallationToolId
  activeViewId: ViewId
  /** Görünüm ▸ Ölçüleri Göster. Görüntüleme tercihi: kaydedilmez, geçmişe girmez. */
  isDimensionsVisible: boolean
  /** Görünüm ▸ Etiketleri Göster (tesisat eleman adları). Ölçülerle aynı gerekçe. */
  isElementLabelsVisible: boolean
  /**
   * Görünüm ▸ Izgarayı Göster. Kapalıyken hem çizgiler kaybolur hem de tesisat
   * araçlarının ızgara yakalaması devre dışı kalır (`plumbing/scene/
   * placementSnap.ts`) — kullanıcı isteği, çizim ızgara yüzünden zorlaşıyordu.
   * Mimari tarafın kendi ızgara yakalaması bu bayrağı OKUMAZ, kapsam dışı.
   */
  isGridVisible: boolean
  setActiveTool: (toolId: ToolId | InstallationToolId) => void
  setActiveView: (viewId: ViewId) => void
  toggleDimensionsVisible: () => void
  toggleElementLabelsVisible: () => void
  toggleGridVisible: () => void
}

/**
 * cadStore'dan AYRI store: kaydedilmez, zundo geçmişine girmez.
 * Araç/görünüm seçiminin projeyi kirletmemesi (issue 2.9) bu ayrımın doğal
 * sonucudur — ayrıca kontrol edilmesi gereken bir kural değil.
 * Zoom/pan burada da yok; onlar kamerada yaşıyor (bkz. scene/useViewportControls).
 */
export const useUiStore = create<UiState>()(
  immer((set) => ({
    activeToolId: DEFAULT_TOOL_ID,
    activeViewId: DEFAULT_VIEW_ID,
    isDimensionsVisible: false,
    // Ölçülerin aksine varsayılan AÇIK: eleman adı çizimin okunmasına gerekli,
    // ölçü ise isteğe bağlı bir kotalama katmanı.
    isElementLabelsVisible: true,
    isGridVisible: true,

    setActiveTool: (toolId) =>
      set((draft) => {
        draft.activeToolId = toolId
      }),

    setActiveView: (viewId) =>
      set((draft) => {
        draft.activeViewId = viewId
        // Görünüm değişince araç o görünümün varsayılanına döner; önceki paletin
        // aracı yeni palette geçersiz kalmasın. isometric'te palet yok, dokunulmaz.
        if (viewId === 'architecture') draft.activeToolId = DEFAULT_TOOL_ID
        if (viewId === 'installation') draft.activeToolId = DEFAULT_INSTALLATION_TOOL_ID
      }),

    toggleDimensionsVisible: () =>
      set((draft) => {
        draft.isDimensionsVisible = !draft.isDimensionsVisible
      }),

    toggleElementLabelsVisible: () =>
      set((draft) => {
        draft.isElementLabelsVisible = !draft.isElementLabelsVisible
      }),

    toggleGridVisible: () =>
      set((draft) => {
        draft.isGridVisible = !draft.isGridVisible
      }),
  })),
)
