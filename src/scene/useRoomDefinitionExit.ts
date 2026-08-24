import { useEffect } from 'react'

import { subscribeDrawSurface } from './drawSurfaceEvents'
import { useArchitectureUiStore } from '../store/architectureUiStore'

const PRIMARY_BUTTON = 0

/**
 * Mahal tanımlama kipinden ÇİZİME TIKLAYARAK da çıkılır (K146).
 *
 * Kipin kapanma yolları kartın X'i ve Esc idi; kullanıcı bulgusu "sahneye
 * tıklayınca da çıksın" — tuvale dönmek, işi bıraktığının en doğal işareti.
 *
 * ⚠️ Yalnız SOL tuş: orta tuş kaydırma, sağ tık araçtan çıkma jesti (K84).
 * Kaydırmak için tuvale basan kullanıcının kipten düşmesi, kipi kullanılamaz
 * kılardı.
 *
 * Hook <Canvas> İÇİNDE mount ediliyor çünkü olaylar `DrawSurface`'ten geliyor;
 * kartın kendisi DOM tarafında ve ui/ ↔ scene/ importu yasak — köprü store.
 */
export function useRoomDefinitionExit(): void {
  useEffect(
    () =>
      subscribeDrawSurface({
        onPointerDown: (event) => {
          if (event.button !== PRIMARY_BUTTON) return
          // Kip kapalıyken action zaten hiçbir şey yazmıyor; ayrıca kontrol
          // etmek yerine store'un kendi koruması kullanılıyor.
          if (useArchitectureUiStore.getState().roomDefinitionQueue === null) return
          useArchitectureUiStore.getState().stopRoomDefinition()
        },
      }),
    [],
  )
}
