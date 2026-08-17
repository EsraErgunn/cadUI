import { useEffect } from 'react'

import { subscribeDrawSurface } from './drawSurfaceEvents'
import { SELECTION_TOOL_ID, WALL_TOOL_ID } from '../core/tools'
import { useUiStore } from '../store/uiStore'

/**
 * Sağ tık AKTİF ARACI BIRAKIR ve seçim aracına döner (K84).
 *
 * Kural artık genel; liste beyaz değil KARA liste, yani yeni bir araç
 * eklendiğinde davranış kendiliğinden geliyor. Unutulup "bu araçtan çıkamıyorum"
 * denen bir araç kalmasın diye böyle: istisna eklemek bilinçli bir iş olmalı.
 *
 * İki istisna var:
 * - **Seçim aracı** — zaten seçimde, dönecek yer yok.
 * - **Duvar** — orada sağ tıkın ZATEN bir işi var: zinciri bitiriyor. İki
 *   adımlı: önce zincir kapanır, boştayken ikinci sağ tık araçtan çıkar
 *   (`useWallTool`). Tek adıma indirilseydi zincirin sonunu getirmek aracı da
 *   kapatırdı ve arka arkaya duvar çizmek imkânsızlaşırdı.
 *
 * Araçların kendi önizleme temizliği KENDİ hook'larında kalıyor: araç değişimi
 * onların effect'ini söküyor ve temizlik zaten orada çalışıyor.
 */
export function useRightClickReturnsToSelection(): void {
  useEffect(
    () =>
      subscribeDrawSurface({
        onContextMenu: () => {
          const { activeToolId, setActiveTool } = useUiStore.getState()
          if (activeToolId === SELECTION_TOOL_ID) return
          if (activeToolId === WALL_TOOL_ID) return

          setActiveTool(SELECTION_TOOL_ID)
        },
      }),
    [],
  )
}
