import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface } from './drawSurfaceEvents'
import { resolveArchitectureTarget } from '../core/architectureHover'
import { getSnapToleranceCm } from '../core/snap'
import { SELECTION_TOOL_ID } from '../core/tools'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/**
 * Duvara ÇİFT TIK düğüm açar, düğüme çift tık düğümü kaldırır (K161).
 *
 * ⚠️ YALNIZ seçim aracında çalışır. Çizim araçlarında çift tıkın kendi anlamı
 * var ya da olabilir (boru zincirini bitiren çift sağ tık gibi); jest her araçta
 * dinlenseydi kullanıcı duvar çizerken istemeden düğüm açardı.
 *
 * ⚠️ Sıra ÖNEMLİ: önce DÜĞÜM aranır, sonra duvar. Düğüm zaten bir duvarın
 * üstünde duruyor; duvar önce sorulsaydı düğümü kaldırmak hiç mümkün olmaz,
 * her çift tık yeni bir düğüm açardı.
 *
 * Hangi işin uygulanabilir olduğuna store karar veriyor
 * (`architectureWallNode.ts`): açıklığın içine düşen bölme, uca çok yakın
 * tıklama, üç duvarlı köşe ve açılı köşe orada reddediliyor. Reddedilen istek
 * sessizce düşer ve proje kirlenmez — burada ikinci bir kural kopyası yok.
 */
export function useWallNodeTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(
    () =>
      subscribeDrawSurface({
        onDoubleClick: (event) => {
          if (useUiStore.getState().activeToolId !== SELECTION_TOOL_ID) return
          // Tolerans zoom'a bağlı; mimari tuval her zaman ortografik
          // (`useSelectionTool` ile aynı koruma).
          if (!(camera instanceof OrthographicCamera)) return

          const cad = useCadStore.getState()
          const target = resolveArchitectureTarget(event.planPoint, {
            points: cad.points,
            walls: cad.walls,
            openings: cad.openings,
            symbols: cad.symbols,
            areaObjects: cad.areaObjects,
            beams: cad.beams,
            floorId: cad.activeFloorId,
            toleranceCm: getSnapToleranceCm(readCameraViewport(camera).zoom),
          })

          if (target?.kind === 'point') {
            cad.mergeWallsAtPoint(target.pointId)
            return
          }
          if (target?.kind === 'wall') {
            cad.splitWallAtPoint(target.wallId, event.planPoint)
          }
        },
      }),
    [camera],
  )
}
