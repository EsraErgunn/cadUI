import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { findSelectedBeamHandle } from './useBeamHandleTool'
import {
  resolveArchitectureTarget,
  type ArchitectureTargetContext,
} from '../core/architectureHover'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { isItemSelected } from '../core/selection'
import { getSnapToleranceCm } from '../core/snap'
import { ERASER_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

type BeamGrab = {
  beamId: Id
  /** Basış anındaki ham imleç noktası; öteleme buna göre ölçülür. */
  grabPoint: PlanPoint
  /** Tutulan kirişin p1 ucu — ızgara yapışması bunun üzerinden hesaplanır. */
  origin: PlanPoint
}

/**
 * Kiriş seçme, taşıma ve silme — `useAreaObjectSelectionTool` ile aynı
 * sözleşme (tek yazım bırakma anında, tek Ctrl+Z).
 *
 * Izgara yapışması p1 ucundan hesaplanıyor, imleçten değil: kullanıcı kirişi
 * ortasından tutsa bile uçları ızgaraya oturmalı — duvarların ucu da orada.
 */
export function useBeamSelectionTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: BeamGrab | undefined

    const readContext = (): ArchitectureTargetContext => {
      const cad = useCadStore.getState()
      return {
        points: cad.points,
        walls: cad.walls,
        openings: cad.openings,
        symbols: cad.symbols,
        areaObjects: cad.areaObjects,
        beams: cad.beams,
        floorId: cad.activeFloorId,
        toleranceCm: getSnapToleranceCm(readCameraViewport(camera).zoom),
      }
    }

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setDraggingBeams(null)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const toolId = useUiStore.getState().activeToolId
      const isEraser = toolId === ERASER_TOOL_ID
      if (toolId !== SELECTION_TOOL_ID && !isEraser) return

      // Uç tutamacının üstündeyse jest `useBeamHandleTool`'un: tutamaç kirişin
      // ucunda, yani gövdenin İÇİNDE — kontrol olmasa aynı basışta hem uzatma
      // hem taşıma başlardı (K44'ün aynı dersi).
      if (findSelectedBeamHandle(event.planPoint, readCameraViewport(camera).zoom)) return

      const target = resolveArchitectureTarget(event.planPoint, readContext())
      if (!target || target.kind !== 'beam') return

      const ui = useArchitectureUiStore.getState()
      const item = { kind: 'beam', id: target.beamId } as const

      if (isEraser) {
        useCadStore.getState().deleteSelection([item])
        return
      }

      // Shift seçime ekler/çıkarır; düz tıklama seçimi değiştirir ama ZATEN
      // seçiliyse korur (KK-10, alan nesnesiyle aynı gerekçe).
      if (event.shiftKey) {
        ui.toggleSelected(item)
        return
      }
      if (!isItemSelected(ui.selection, item)) ui.setSelection([item])

      const beam = useCadStore.getState().beams.find((candidate) => candidate.id === target.beamId)
      if (!beam) return

      grab = {
        beamId: beam.id,
        grabPoint: event.planPoint,
        origin: { x: beam.x1, y: beam.y1 },
      }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) return

      const raw = {
        x: grab.origin.x + (event.planPoint.x - grab.grabPoint.x),
        y: grab.origin.y + (event.planPoint.y - grab.grabPoint.y),
      }
      const { zoom } = readCameraViewport(camera)
      // Ctrl ızgarayı kapatır — köşe/sembol/alan nesnesi sürüklemesiyle aynı jest.
      const next = event.ctrlKey ? raw : getPlacementPosition(raw, zoom)

      useArchitectureUiStore.getState().setDraggingBeams({
        beamIds: [grab.beamId],
        dxCm: next.x - grab.origin.x,
        dyCm: next.y - grab.origin.y,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { beamId } = grab
      const drag = useArchitectureUiStore.getState().draggingBeams
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz.
      if (!drag || (drag.dxCm === 0 && drag.dyCm === 0)) return

      useCadStore.getState().moveBeam(beamId, drag.dxCm, drag.dyCm)
    }

    // Esc taşımayı iptal eder: kiriş eski yerinde kalır çünkü store'a yazılmadı.
    const handleCancel = () => endDrag()

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onCancel: handleCancel,
    })

    return () => {
      unsubscribe()
      endDrag()
    }
  }, [camera])
}
