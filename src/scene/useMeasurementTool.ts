import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import { getPlacementPosition } from '../core/placement'
import { MEASURE_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type MeasurementToolState = {
  /** Ölçüm aracı kapalıysa false — sahne hiçbir şey çizmez. */
  isActive: boolean
  /** Izgaraya oturmuş imleç. useFrame okur; her pointermove React render'ı tetiklemesin. */
  cursorRef: RefObject<PlanPoint | null>
}

/**
 * İki noktalı ölçüm: 1. tık başlangıcı koyar, imleç ikinci noktayı taşır, 2. tık
 * ölçüyü sabitler. Sonuç KALICI DEĞİL — `architectureUiStore`da yaşar, cadStore'a
 * yazılmaz, `markDirty` çağırmaz, kaydedilen JSON'a girmez (K80).
 *
 * Tesisattaki `plumbing/scene/useMeasurementTool.ts` ile aynı jest, ama YAKALAMA
 * kuralı mimarininki: Ctrl ızgarayı anlık kapatır (`useAreaObjectTool`,
 * `usePointDragTool` ile aynı). Tesisatınki ızgara GÖRÜNÜRLÜĞÜNE bakıyor; o
 * ayrım tesisat sahibinin açık kararı, buraya taşınmaz.
 *
 * Araç mantığı DrawSurface'e YAZILMAZ (kural 7); DrawSurface yalnız ham pointer
 * olayını yayınlar.
 */
export function useMeasurementTool(): MeasurementToolState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const cursorRef = useRef<PlanPoint | null>(null)
  const isActive = activeToolId === MEASURE_TOOL_ID

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    const resolvePoint = (event: DrawSurfacePointerEvent): PlanPoint => {
      if (event.ctrlKey) return event.planPoint
      return getPlacementPosition(event.planPoint, readCameraViewport(camera).zoom)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        cursorRef.current = resolvePoint(event)
      },

      onPointerDown: (event) => {
        if (event.button !== LEFT_BUTTON) return

        // Konum pointermove'a bırakılmaz: dokunmatikte tıklamadan önce hareket gelmez.
        const point = resolvePoint(event)
        cursorRef.current = point

        const { measurement, startMeasurement, finishMeasurement } =
          useArchitectureUiStore.getState()

        // Tamamlanmış ölçümün üstüne tıklamak YENİSİNİ başlatır: ölçü almak
        // tekrarlanan bir jest, her seferinde aracı yeniden seçtirmek gereksiz.
        if (!measurement || measurement.end !== null) {
          startMeasurement(point)
          return
        }

        // Aynı yere ikinci tık sıfır boy ölçü yazardı (duvar aracıyla aynı kural).
        if (measurement.start.x === point.x && measurement.start.y === point.y) return

        finishMeasurement(point)
      },

      onCancel: () => useArchitectureUiStore.getState().clearMeasurement(),
    })

    return () => {
      unsubscribe()
      // Araç değişince ölçü ekranda asılı kalmasın.
      useArchitectureUiStore.getState().clearMeasurement()
      cursorRef.current = null
    }
  }, [camera, isActive])

  return { isActive, cursorRef }
}
