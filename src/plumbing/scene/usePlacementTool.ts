import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import type { PlanPoint } from '../../core/coords'
import { getPlacementPosition } from '../../core/placement'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { getPlacementElementType } from '../core/installationTools'
import type { InstallationElementType } from '../core/symbolMetadata'

const LEFT_BUTTON = 0

export type PlacementPreviewState = {
  /** Yerleştirme aracı kapalıysa null — önizleme de çizilmez. */
  elementType: InstallationElementType | null
  /** Snap uygulanmış imleç konumu. useFrame okur; her pointermove React render'ı tetiklemesin. */
  positionRef: RefObject<PlanPoint | null>
}

/**
 * Eleman yerleştirme aracı. DrawSurface yalnız ham pointer olayı yayınlar; araç
 * mantığı CLAUDE.md kural 7 gereği burada durur.
 *
 * Yerleştirme pointerUP'ta yapılır. Böylece iki giriş yolu TEK kod yolu olur:
 * tuvale tıklama (down+up) ve palet butonundan sürükleyip tuvale bırakma
 * (down butonda, up tuvalde) — aynı jest iki kez eleman eklemez.
 */
export function usePlacementTool(): PlacementPreviewState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const positionRef = useRef<PlanPoint | null>(null)
  const elementType = getPlacementElementType(activeToolId)

  useEffect(() => {
    if (!elementType || !(camera instanceof OrthographicCamera)) return undefined

    const snapAt = (planPoint: PlanPoint) =>
      getPlacementPosition(planPoint, readCameraViewport(camera).zoom)

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        positionRef.current = snapAt(event.planPoint)
      },

      onPointerUp: (event) => {
        if (event.button !== LEFT_BUTTON) return

        const position = snapAt(event.planPoint)
        positionRef.current = position
        // Araç bilerek aktif kalır: arka arkaya eleman eklenebilsin.
        useCadStore.getState().addElement({ type: elementType, position })
      },

      onCancel: () => {
        positionRef.current = null
      },
    })

    return () => {
      unsubscribe()
      // Araç değişince önizleme son konumunda asılı kalmasın.
      positionRef.current = null
    }
  }, [camera, elementType])

  return { elementType, positionRef }
}
