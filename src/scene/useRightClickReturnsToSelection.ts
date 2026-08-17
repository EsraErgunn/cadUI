import { useEffect } from 'react'

import { subscribeDrawSurface } from './drawSurfaceEvents'
import { SELECTION_TOOL_ID, WALL_TOOL_ID } from '../core/tools'
import { INSTALLATION_PIPE_TOOL_ID } from '../plumbing/core/installationTools'
import { useUiStore } from '../store/uiStore'

/**
 * Sağ tık AKTİF ARACI BIRAKIR ve seçim aracına döner (K84).
 *
 * Kural artık genel; liste beyaz değil KARA liste, yani yeni bir araç
 * eklendiğinde davranış kendiliğinden geliyor. Unutulup "bu araçtan çıkamıyorum"
 * denen bir araç kalmasın diye böyle: istisna eklemek bilinçli bir iş olmalı.
 *
 * `activeToolId` mimari ve tesisat araçları arasında PAYLAŞILAN tek store'da
 * (`useUiStore`) durur, bu yüzden bu hook mimari dışı araçları da görür.
 *
 * İstisnalar:
 * - **Seçim aracı** — zaten seçimde, dönecek yer yok.
 * - **Duvar** — orada sağ tıkın ZATEN bir işi var: zinciri bitiriyor. İki
 *   adımlı: önce zincir kapanır, boştayken ikinci sağ tık araçtan çıkar
 *   (`useWallTool`). Tek adıma indirilseydi zincirin sonunu getirmek aracı da
 *   kapatırdı ve arka arkaya duvar çizmek imkânsızlaşırdı.
 * - **Boru** — aynı iki adımlı jest `useLineTool`'da: tek sağ tık son adımı
 *   keser, çift sağ tık zinciri bitirir. Bu hook araya girip tek sağ tıkta
 *   araçtan çıkarsa boru kesme hiç çalışmaz, her sağ tık çizimi bitirirdi.
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
          if (activeToolId === INSTALLATION_PIPE_TOOL_ID) return

          setActiveTool(SELECTION_TOOL_ID)
        },
      }),
    [],
  )
}
