import { useEffect } from 'react'

import { subscribeDrawSurface } from '../../scene/drawSurfaceEvents'
import { useUiStore } from '../../store/uiStore'
import { getLineKind, INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'

/**
 * Esc yerleştirmeyi iptal etmekle kalmaz, paleti seçim aracına döndürür: art arda
 * eleman ekleyen kullanıcı "bu jest bitti" demek için tek tuşa basar, sonra
 * eklediğini seçip taşıyabilir.
 *
 * Ayrı hook: useSelectionTool YALNIZ seçim aracı etkinken dinliyor, oysa geri
 * dönüşü tetikleyecek Esc tam da BAŞKA bir araç etkinken geliyor. Esc'i DrawSurface
 * yayınlıyor (onCancel), tuş burada ikinci kez yakalanmaz.
 */
export function useEscapeToSelectionTool(): void {
  useEffect(() => {
    const unsubscribe = subscribeDrawSurface({
      onCancel: () => {
        const { activeToolId, setActiveTool } = useUiStore.getState()
        if (activeToolId === INSTALLATION_SELECTION_TOOL_ID) return
        // Hat aracında Esc yarım hattı iptal eder ama araç AKTİF KALIR (şartname):
        // kullanıcı paleti yeniden seçmeden yeni hatta başlayabilsin. İptalin
        // kendisi useLineTool'da.
        if (getLineKind(activeToolId)) return
        setActiveTool(INSTALLATION_SELECTION_TOOL_ID)
      },
    })

    return unsubscribe
  }, [])
}
