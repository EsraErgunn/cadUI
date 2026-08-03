import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface } from './drawSurfaceEvents'
import { isSameTarget, resolveArchitectureTarget } from '../core/architectureHover'
import { getSnapToleranceCm } from '../core/snap'
import { SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/**
 * İmlecin altındaki duvarı/köşeyi vurgular. Araç mantığı DrawSurface'e YAZILMAZ
 * (CLAUDE.md kural 7); bu da kendi hook'unda.
 *
 * Yalnız Seçim Aracı'nda çalışır: çizim araçlarında zaten yapışma işareti var,
 * ikisi birden gösterilince tuval kalabalıklaşıyor.
 *
 * Sürükleme sırasında vurgu DONDURULUR. `usePointDragTool` sürüklenen köşeyi
 * snap'ten hariç tutuyor, dolayısıyla hover başka bir köşeye atlar ve kullanıcı
 * taşımadığı bir köşenin yandığını görür.
 */
export function useArchitectureHover(): void {
  const isActive = useUiStore((state) => state.activeToolId === SELECTION_TOOL_ID)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) {
      useArchitectureUiStore.getState().setHover(null)
      return undefined
    }

    const clearHover = () => useArchitectureUiStore.getState().setHover(null)

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        const ui = useArchitectureUiStore.getState()
        if (ui.draggingPoint || ui.draggingWall) {
          if (ui.hover) clearHover()
          return
        }

        const cad = useCadStore.getState()
        const next = resolveArchitectureTarget(event.planPoint, {
          points: cad.points,
          walls: cad.walls,
          openings: cad.openings,
          floorId: cad.activeFloorId,
          toleranceCm: getSnapToleranceCm(readCameraViewport(camera).zoom),
        })

        // Aynı nesneyse yazma: her fare hareketinde set() tüm aboneleri render eder.
        if (isSameTarget(ui.hover ?? undefined, next)) return
        ui.setHover(next ?? null)
      },

      // Sürükleme başlarken vurgu kalkar; bırakınca ilk harekette geri gelir.
      onPointerDown: clearHover,
      onCancel: clearHover,
    })

    return () => {
      unsubscribe()
      clearHover()
    }
  }, [camera, isActive])
}
