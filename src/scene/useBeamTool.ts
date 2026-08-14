import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { isGridSnapActive } from './gridSnapMode'
import type { PlanPoint } from '../core/coords'
import { pickGridLevel } from '../core/grid'
import { getSnapToleranceCm, resolveSnap } from '../core/snap'
import { BEAM_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type BeamPreview = {
  /** Birinci tıklama yapılmadıysa null — o ana kadar yalnız imleç izlenir. */
  start: PlanPoint | null
  cursor: PlanPoint
}

/**
 * Kiriş çizim aracı: ilk sol tık başlangıcı koyar, imlece lastik önizleme
 * uzanır, ikinci sol tık kirişi yazar. Duvar aracıyla AYNI jest — kiriş de iki
 * uçlu çizgisel bir eleman.
 *
 * Duvardan iki farkı var:
 * - ZİNCİR YOK. İkinci tıklama kirişi bitirir, yeni kiriş yeni bir başlangıç
 *   ister: kirişler duvarlar gibi kapalı çevrim kurmuyor, zincir kullanıcıya
 *   istemediği ikinci bir kirişi kazayla çizdirirdi.
 * - Sağ tık yarım jesti iptal eder ve paleti Seçim Aracı'na döndürür (K42,
 *   alan nesnesi aracıyla aynı sözleşme).
 *
 * Snap duvar aracıyla AYNI (`resolveSnap`): kiriş duvar köşelerine ve duvar
 * gövdesine yapışsın — plan üstünde kirişin ucu tipik olarak bir duvara oturur.
 * Ctrl ızgarayı kapatır.
 */
export function useBeamTool(): BeamPreview | undefined {
  const isActive = useUiStore((state) => state.activeToolId === BEAM_TOOL_ID)
  const camera = useThree((state) => state.camera)
  const [preview, setPreview] = useState<BeamPreview | undefined>(undefined)

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    let start: PlanPoint | null = null

    const snapAt = (event: DrawSurfacePointerEvent): PlanPoint => {
      const { zoom } = readCameraViewport(camera)
      const cad = useCadStore.getState()
      return resolveSnap(
        event.planPoint,
        { points: cad.points, walls: cad.walls, floorId: cad.activeFloorId },
        {
          toleranceCm: getSnapToleranceCm(zoom),
          gridStepCm: pickGridLevel(zoom).minorCm,
          isGridSnapEnabled: isGridSnapActive(event),
        },
      ).point
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        setPreview({ start, cursor: snapAt(event) })
      },

      onPointerDown: (event) => {
        // Sağ tık pointerdown'ı da tetikler; yalnız sol tuş nokta koyar.
        if (event.button !== LEFT_BUTTON) return

        const point = snapAt(event)
        if (start === null) {
          start = point
          setPreview({ start, cursor: point })
          return
        }

        // Sıfır boy segment `addBeam` içinde reddedilir (id bile harcanmaz);
        // başlangıç yerinde kalır ki kullanıcı ikinci ucu yeniden gösterebilsin.
        const created = useCadStore.getState().addBeam({ start, end: point })
        if (created === undefined) {
          setPreview({ start, cursor: point })
          return
        }

        start = null
        setPreview({ start: null, cursor: point })
      },

      // Sağ tık jesti bitirir: yarım kiriş atılır, palet Seçim Aracı'na döner.
      onContextMenu: () => {
        start = null
        setPreview(undefined)
        useUiStore.getState().setActiveTool(SELECTION_TOOL_ID)
      },

      // Esc yalnız yarım jesti iptal eder, araç aktif kalır (duvar aracıyla aynı).
      onCancel: () => {
        start = null
        setPreview(undefined)
      },
    })

    return () => {
      unsubscribe()
      // Araç değişince yarım önizleme asılı kalmasın.
      setPreview(undefined)
    }
  }, [camera, isActive])

  return isActive ? preview : undefined
}
