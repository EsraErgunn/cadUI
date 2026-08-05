import { useEffect } from 'react'

import { subscribeDrawSurface } from '../../scene/drawSurfaceEvents'
import { useUiStore } from '../../store/uiStore'
import { INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'

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
        setActiveTool(INSTALLATION_SELECTION_TOOL_ID)
      },
    })

    return unsubscribe
  }, [])
}
