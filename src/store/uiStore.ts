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
  setActiveTool: (toolId: ToolId | InstallationToolId) => void
  setActiveView: (viewId: ViewId) => void
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
  })),
)
