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
import {
  getElementAngleFromPointer,
  getElementAnchorOffset,
  getElementRotateAnchorLocal,
  isPointerOnElementRotateHandle,
  type ElementRotateFollower,
} from '../core/elementRotateHandle'
import type { InstallationElement } from '../core/installationModel'
import { INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import type { SymbolMetadata } from '../core/symbolMetadata'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PRIMARY_BUTTON = 0

/**
 * İmleç, TEK seçili ve döndürülebilir (bkz. `getElementRotateAnchorLocal`)
 * elemanın döndürme tutamacının üstünde mi? `useSelectionTool.ts` bu kontrolü
 * kendi `handlePointerDown`'ının BAŞINDA çağırıp erken döner — yoksa tutamaca
 * tıklamak (gövdenin dışına taştığı için) "boşluk" gibi görünüp çerçeve
 * seçimi başlatırdı (knowledge/area-objects.md K44 ile aynı tuzak).
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

  const metadata = getLoadedSymbol(element.type).metadata
  const anchorLocal = getElementRotateAnchorLocal(
    element.id,
    metadata,
    cad.installationConnections,
    cad.installationLines,
  )
  if (!anchorLocal) return undefined

  return isPointerOnElementRotateHandle(planPoint, element, metadata, zoom) ? element : undefined
}

type RotateGrab = {
  elementId: InstallationElement['id']
  metadata: SymbolMetadata
  scale: number
  pivotLocal: readonly [number, number]
  /** Elemanın tutunduğu noktanın DÜNYA konumu — döndürme boyunca SABİT kalır. */
  anchorWorld: PlanPoint
  /** Pivotun dışında kalan tutunma — varsa, döndürme boyunca YENİ port konumuna çekilir. */
  followers: readonly ElementRotateFollower[]
}

/**
 * Elemanın döndürme tutamacıyla döndürülmesi. Mimari taraftaki
 * `useAreaObjectHandleTool.ts` ile AYNI sözleşme: sürükleme boyunca cadStore
 * YAZILMAZ, önizleme `plumbingUiStore.elementRotateDrag`'da durur, tek yazım
 * bırakma anında olur (tek markDirty, tek Ctrl+Z). Boruya/porta bağlı bir
 * eleman için imlecin döndüğü eksen elemanın KENDİ konumu değil, tutunduğu
 * `anchorWorld` noktasıdır — gövde bu nokta etrafında döner, tutunduğu yer
 * dünyada hiç kıpırdamaz (`elementRotateHandle.ts` → `getElementAnchorOffset`).
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

      const metadata = getLoadedSymbol(hit.type).metadata
      const cad = useCadStore.getState()
      const anchors = getElementRotateAnchorLocal(
        hit.id,
        metadata,
        cad.installationConnections,
        cad.installationLines,
      )
      // findSelectedElementRotateHandle zaten eledi — burada yalnız savunma.
      if (!anchors) return

      const offset = getElementAnchorOffset(hit, metadata, anchors.pivotLocal, hit.angleDeg)
      grab = {
        elementId: hit.id,
        metadata,
        scale: hit.scale,
        pivotLocal: anchors.pivotLocal,
        anchorWorld: { x: hit.position.x + offset.x, y: hit.position.y + offset.y },
        followers: anchors.followers,
      }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) {
        setHover(findSelectedElementRotateHandle(event.planPoint, readZoom()) !== undefined)
        return
      }

      // Açı KK-3'ün 15° adımına yakalanır — AreaObject panelinden yazmakla
      // aynı kural (`snapAngleDeg`, core/transform.ts).
      const angleDeg = snapAngleDeg(getElementAngleFromPointer(event.planPoint, grab.anchorWorld))
      const offset = getElementAnchorOffset(
        { scale: grab.scale },
        grab.metadata,
        grab.pivotLocal,
        angleDeg,
      )
      const position = { x: grab.anchorWorld.x - offset.x, y: grab.anchorWorld.y - offset.y }

      // Takipçi(ler): pivotun aksine dünyada SABİT KALMAZ, elemanla birlikte
      // döner — yeni port konumu her karede yeniden hesaplanır (`InstallationLineMesh.tsx`
      // → `useDraggedCorners`, bağlı hattı bu konuma çeker, boru gerilir).
      // `grab` bir `let`; TS bunu kapanan ok fonksiyonuna daraltılmış taşımaz —
      // yerel `const` takma ad şart (yoksa `possibly undefined`).
      const activeGrab = grab
      const followers = activeGrab.followers.map((follower) => {
        const followerOffset = getElementAnchorOffset(
          { scale: activeGrab.scale },
          activeGrab.metadata,
          follower.local,
          angleDeg,
        )
        return {
          lineId: follower.lineId,
          pointId: follower.pointId,
          position: { x: position.x + followerOffset.x, y: position.y + followerOffset.y },
        }
      })

      usePlumbingUiStore.getState().setElementRotateDrag({
        elementId: grab.elementId,
        angleDeg,
        position,
        followers,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { elementId } = grab
      // Hiç hareket etmediyse (yalnız tutamaca tıklama) store'a yazılmaz.
      const drag = usePlumbingUiStore.getState().elementRotateDrag
      endDrag()
      if (!drag) return

      useCadStore.getState().rotateElement(elementId, drag.angleDeg, drag.position, drag.followers)
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
