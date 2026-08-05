import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import type { PointSymbolType } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { getPointSymbolTypeForTool } from '../core/pointSymbol'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type PointSymbolPreview = {
  type: PointSymbolType
  position: PlanPoint
}

/**
 * Nokta sembolü yerleştirme aracı (Desen A, KK-1). DrawSurface yalnız ham pointer
 * olayı yayınlar; araç mantığı CLAUDE.md kural 7 gereği burada durur.
 *
 * Yerleştirme pointer **UP**'ta yapılır — tesisat tarafındaki `usePlacementTool`
 * ile aynı sözleşme (knowledge/plumbing-placement.md). Palet iki giriş yolu
 * vaat ediyor: araca tıkla→tuvale tıkla ve palet butonundan tuvale sürükle.
 * İkisinde de tuvale bir pointerup düşer; down'da yerleştirilseydi ilk yol için
 * ayrıca "bu jest zaten yerleştirdi" bayrağı tutmak gerekirdi.
 *
 * Yerleştirmeden sonra araç bilerek AKTİF KALIR: arka arkaya sembol eklenebilsin.
 *
 * Yerleşimin uygunluğu DENETLENMEZ (tutanak K-6): sembol duvarın üstüne de,
 * boşluğa da bırakılabilir. Uygunsuz durumlar hata kontrollerinin işi.
 */
export function usePointSymbolTool(): PointSymbolPreview | undefined {
  const camera = useThree((state) => state.camera)
  const activeToolId = useUiStore((state) => state.activeToolId)
  const symbolType = getPointSymbolTypeForTool(activeToolId)
  // Önizleme React state'inde: sembol geometrisi zaten her karede değil, imleç
  // ızgara adımını GEÇTİĞİNDE değişiyor — ref+useFrame'in kazancı yok, kod
  // karmaşıklığı var (tesisat önizlemesi ölçek/rotasyon taşıdığı için orada ref).
  const [preview, setPreview] = useState<PointSymbolPreview | undefined>(undefined)

  useEffect(() => {
    // Burada setPreview ÇAĞRILMAZ: effect gövdesinde senkron setState zincirleme
    // render tetikler. Temizlik zaten araç değişiminde koşuyor ve dönüş değeri
    // aşağıda symbolType ile korunuyor.
    if (!symbolType || !(camera instanceof OrthographicCamera)) return undefined

    const snapAt = (planPoint: PlanPoint) =>
      getPlacementPosition(planPoint, readCameraViewport(camera).zoom)

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event: DrawSurfacePointerEvent) => {
        const position = snapAt(event.planPoint)
        // Aynı ızgara noktasında yeni nesne yazılmaz: her fare hareketi render etmesin.
        setPreview((current) =>
          current && current.position.x === position.x && current.position.y === position.y
            ? current
            : { type: symbolType, position },
        )
      },

      onPointerUp: (event: DrawSurfacePointerEvent) => {
        if (event.button !== LEFT_BUTTON) return
        useCadStore.getState().addPointSymbol({
          type: symbolType,
          position: snapAt(event.planPoint),
        })
      },

      onCancel: () => setPreview(undefined),
    })

    return () => {
      unsubscribe()
      // Araç değişince önizleme son konumunda asılı kalmasın.
      setPreview(undefined)
    }
  }, [camera, symbolType])

  return symbolType ? preview : undefined
}
