import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { BeamEndKey } from '../core/beam'
import { findBeamHandleAt } from '../core/beamHandles'
import type { PlanPoint } from '../core/coords'
import { pickGridLevel } from '../core/grid'
import type { Beam, Id } from '../core/model'
import { getSoleSelectedId } from '../core/selection'
import { getSnapToleranceCm, resolveSnap } from '../core/snap'
import { SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

/** Uç sürüklerken çapraz ok anlamsız; `move` "bu noktayı taşı" diyen yerleşik biçim. */
const HANDLE_CURSOR = 'move'

/**
 * İmleç, TEK seçili kirişin uçlarından birinin üstünde mi?
 *
 * Tutma alanı EKRAN pikselinde, bu yüzden `zoom` geçilir. Diğer araç hook'ları
 * da bunu çağırır ve doluysa jesti hiç başlatmaz: tutamaç kirişin ucunda
 * duruyor, yani gövdenin İÇİNDE — kontrol olmasa aynı basışta hem uzatma hem
 * taşıma başlardı (alan nesnesi tutamaçlarındaki K44 dersinin aynısı).
 *
 * Tutamaçlar YALNIZ Seçim Aracı'nda ve TEK kiriş seçiliyken var.
 */
export function findSelectedBeamHandle(
  planPoint: PlanPoint,
  zoom: number,
): { beam: Beam; end: BeamEndKey } | undefined {
  if (useUiStore.getState().activeToolId !== SELECTION_TOOL_ID) return undefined

  const beamId = getSoleSelectedId(useArchitectureUiStore.getState().selection, 'beam')
  if (beamId === undefined) return undefined

  const cad = useCadStore.getState()
  const beam = cad.beams.find((candidate) => candidate.id === beamId)
  if (!beam || beam.floorId !== cad.activeFloorId) return undefined

  const end = findBeamHandleAt(planPoint, beam, zoom)
  return end ? { beam, end } : undefined
}

type HandleGrab = {
  beamId: Id
  end: BeamEndKey
}

/**
 * Kirişi ucundan tutup uzatma/kısaltma.
 *
 * Sürükleme boyunca cadStore'a YAZILMAZ; önizleme `architectureUiStore`'da
 * durur, tek yazım bırakma anında olur — taşımayla aynı sözleşme (tek
 * markDirty, tek Ctrl+Z).
 *
 * Snap çizim aracıyla AYNI (`resolveSnap`): uzatılan uç da duvar köşesine ve
 * ızgaraya yapışır, Ctrl ızgarayı kapatır.
 */
export function useBeamHandleTool(): void {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: HandleGrab | undefined

    const readZoom = () => readCameraViewport(camera).zoom

    const setCursor = (isOverHandle: boolean) => {
      domElement.style.cursor = isOverHandle ? HANDLE_CURSOR : ''
      useArchitectureUiStore.getState().setBeamHandleHover(isOverHandle)
    }

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setBeamHandleDrag(null)
    }

    const snapAt = (event: DrawSurfacePointerEvent): PlanPoint => {
      const zoom = readZoom()
      const cad = useCadStore.getState()
      return resolveSnap(
        event.planPoint,
        { points: cad.points, walls: cad.walls, floorId: cad.activeFloorId },
        {
          toleranceCm: getSnapToleranceCm(zoom),
          gridStepCm: pickGridLevel(zoom).minorCm,
          isGridSnapEnabled: !event.ctrlKey,
        },
      ).point
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: (event) => {
        if (event.button !== PRIMARY_BUTTON) return

        const hit = findSelectedBeamHandle(event.planPoint, readZoom())
        if (!hit) return

        grab = { beamId: hit.beam.id, end: hit.end }
      },

      onPointerMove: (event) => {
        if (!grab) {
          // Sürükleme yokken yalnız vurgu/imleç güncellenir.
          setCursor(findSelectedBeamHandle(event.planPoint, readZoom()) !== undefined)
          return
        }

        useArchitectureUiStore.getState().setBeamHandleDrag({
          beamId: grab.beamId,
          end: grab.end,
          position: snapAt(event),
        })
      },

      onPointerUp: (event) => {
        if (!grab || event.button !== PRIMARY_BUTTON) return

        const { beamId, end } = grab
        // Hiç hareket etmediyse (yalnız tutamaca tıklama) store'a yazılmaz.
        const hasPreview = useArchitectureUiStore.getState().beamHandleDrag !== null
        const position = snapAt(event)
        endDrag()
        if (!hasPreview) return

        // Minimum boyun altına inen sonuç reddedilir; kiriş eski hâlinde kalır
        // çünkü store'a hiç dokunulmamıştı (K13 deseni).
        useCadStore.getState().moveBeamEnd(beamId, end, position)
      },

      // Esc sürüklemeyi iptal eder: kiriş eski hâlinde kalır, store'a yazılmadı.
      onCancel: () => {
        endDrag()
        setCursor(false)
      },
    })

    return () => {
      unsubscribe()
      endDrag()
      // İmleç biçimi elle yazıldığı için elle geri alınmalı; araç değişince
      // tuvalde "taşı" imleci asılı kalmasın.
      setCursor(false)
    }
  }, [camera, domElement])
}
