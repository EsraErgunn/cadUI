import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import type { PlanPoint } from '../../core/coords'
import { getPlacementPosition } from '../../core/placement'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useUiStore } from '../../store/uiStore'
import { isMeasurementTool } from '../core/installationTools'
import { isSamePoint } from '../core/lineGeometry'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const LEFT_BUTTON = 0

export type MeasurementToolState = {
  /** Ölçüm aracı kapalıysa false — sahne hiçbir şey çizmez. */
  isActive: boolean
  /** Izgaraya oturmuş imleç. useFrame okur; her pointermove React render'ı tetiklemesin. */
  cursorRef: RefObject<PlanPoint | null>
}

/**
 * İki noktalı ölçüm: 1. tık başlangıcı koyar, imleç ikinci noktayı taşır, 2. tık
 * ölçüyü sabitler. Sonuç KALICI DEĞİL — `plumbingUiStore`da yaşar, cadStore'a
 * yazılmaz, `markDirty` çağırmaz, kaydedilen JSON'a girmez.
 *
 * Araç mantığı DrawSurface'e YAZILMAZ (kural 7); DrawSurface yalnız ham pointer
 * olayını yayınlar.
 *
 * Temizlemenin TEK adresi `clearMeasurement`: Esc doğrudan çağırır, araç
 * değişimi de effect temizliğinden aynı yere düşer.
 */
export function useMeasurementTool(): MeasurementToolState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const cursorRef = useRef<PlanPoint | null>(null)
  const isActive = isMeasurementTool(activeToolId)

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    /**
     * Ölçüm noktası boruların oturduğu ızgaraya yapışır, yoksa çizilmiş bir
     * köşeyi ölçmek imkânsızlaşır ve sayı hiç yuvarlak çıkmazdı. Ctrl ızgarayı
     * kapatır — eleman ve boru jestiyle aynı.
     */
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

        const { measurement, startMeasurement, finishMeasurement } = usePlumbingUiStore.getState()

        // Tamamlanmış ölçümün üstüne tıklamak YENİSİNİ başlatır: ölçü almak
        // tekrarlanan bir jest, her seferinde aracı yeniden seçtirmek gereksiz.
        if (!measurement || measurement.end !== null) {
          startMeasurement(point)
          return
        }

        // Aynı yere ikinci tık sıfır boy ölçü yazardı (boru aracıyla aynı kural).
        if (isSamePoint(measurement.start, point)) return

        finishMeasurement(point)
      },

      // Esc ölçümü siler. Araç da seçim aracına döner (useEscapeToSelectionTool)
      // ve aşağıdaki temizlik zaten çalışırdı; yine de burada BIRAKILIR: iki yol
      // da aynı kapıya, clearMeasurement'a çıkar.
      onCancel: () => usePlumbingUiStore.getState().clearMeasurement(),
    })

    return () => {
      unsubscribe()
      // Araç değişince ölçü ekranda asılı kalmasın.
      usePlumbingUiStore.getState().clearMeasurement()
      cursorRef.current = null
    }
  }, [camera, isActive])

  return { isActive, cursorRef }
}
