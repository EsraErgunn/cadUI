import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { getLoadedSymbol } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { snapAngleDeg } from '../../core/transform'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { getElementAttachMode } from '../core/attachModes'
import {
  getElementAngleFromPointer,
  hasAnyPortConnection,
  isPointerOnElementRotateHandle,
} from '../core/elementRotateHandle'
import type { InstallationElement } from '../core/installationModel'
import { INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PRIMARY_BUTTON = 0

/**
 * İmleç, TEK seçili SERBEST (ve bağlanmamış) elemanın döndürme tutamacının
 * üstünde mi? `useSelectionTool.ts` bu kontrolü kendi `handlePointerDown`'ının
 * BAŞINDA çağırıp erken döner — yoksa tutamaca tıklamak (gövdenin dışına
 * taştığı için) "boşluk" gibi görünüp çerçeve seçimi başlatırdı
 * (knowledge/area-objects.md K44 ile aynı tuzak).
 */
export function findSelectedElementRotateHandle(
  planPoint: PlanPoint,
  zoom: number,
): InstallationElement | undefined {
  if (useUiStore.getState().activeToolId !== INSTALLATION_SELECTION_TOOL_ID) return undefined

  const ui = usePlumbingUiStore.getState()
  if (ui.selectedElementIds.length !== 1 || ui.selectedLineIds.length !== 0) return undefined

  const cad = useCadStore.getState()
  const element = cad.installationElements.find(
    (candidate) => candidate.id === ui.selectedElementIds[0],
  )
  if (!element || element.floorId !== cad.activeFloorId) return undefined
  if (getElementAttachMode(element.type) !== 'free') return undefined
  if (hasAnyPortConnection(cad.installationConnections, element.id)) return undefined

  const metadata = getLoadedSymbol(element.type).metadata
  return isPointerOnElementRotateHandle(planPoint, element, metadata, zoom) ? element : undefined
}

type RotateGrab = {
  elementId: InstallationElement['id']
  /** Elemanın KENDİ konumu — döndürme ekseni, tutamacın konumu DEĞİL. */
  center: PlanPoint
}

/**
 * Serbest elemanın döndürme tutamacıyla döndürülmesi. Mimari taraftaki
 * `useAreaObjectHandleTool.ts` ile AYNI sözleşme: sürükleme boyunca cadStore
 * YAZILMAZ, önizleme `plumbingUiStore.elementRotateDrag`'da durur, tek yazım
 * bırakma anında olur (tek markDirty, tek Ctrl+Z).
 */
export function useElementRotateTool(): void {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: RotateGrab | undefined

    const readZoom = () => readCameraViewport(camera).zoom

    const setHover = (isHovered: boolean) => {
      domElement.style.cursor = isHovered ? 'grab' : ''
      usePlumbingUiStore.getState().setElementRotateHandleHovered(isHovered)
    }

    const endDrag = () => {
      grab = undefined
      usePlumbingUiStore.getState().setElementRotateDrag(null)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const hit = findSelectedElementRotateHandle(event.planPoint, readZoom())
      if (!hit) return

      grab = { elementId: hit.id, center: hit.position }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) {
        setHover(findSelectedElementRotateHandle(event.planPoint, readZoom()) !== undefined)
        return
      }

      // Açı KK-3'ün 15° adımına yakalanır — AreaObject panelinden yazmakla
      // aynı kural (`snapAngleDeg`, core/transform.ts).
      const rawAngleDeg = getElementAngleFromPointer(event.planPoint, grab.center)
      usePlumbingUiStore.getState().setElementRotateDrag({
        elementId: grab.elementId,
        angleDeg: snapAngleDeg(rawAngleDeg),
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { elementId } = grab
      // Hiç hareket etmediyse (yalnız tutamaca tıklama) store'a yazılmaz.
      const drag = usePlumbingUiStore.getState().elementRotateDrag
      endDrag()
      if (!drag) return

      useCadStore.getState().rotateElement(elementId, drag.angleDeg)
    }

    // Esc sürüklemeyi iptal eder: eleman eski açısında kalır, store'a yazılmadı.
    const handleCancel = () => {
      endDrag()
      setHover(false)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onCancel: handleCancel,
    })

    return () => {
      unsubscribe()
      endDrag()
      // Araç/görünüm değişince tuvalde "döndürme" imleci asılı kalmasın.
      setHover(false)
    }
  }, [camera, domElement])
}
