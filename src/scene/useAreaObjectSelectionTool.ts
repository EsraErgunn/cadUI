import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { findSelectedAreaObjectHandle } from './useAreaObjectHandleTool'
import { findAreaObjectLabelAt } from './useAreaObjectLabelTool'
import { findSelectedBeamHandle } from './useBeamHandleTool'
import { findPointSymbolLabelAt } from './usePointSymbolLabelTool'
import { findTextLabelAtPointer } from './useTextSelectionTool'
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

type AreaObjectGrab = {
  areaObjectId: Id
  /** Basış anındaki ham imleç noktası; öteleme buna göre ölçülür. */
  grabPoint: PlanPoint
  /** Tutulan nesnenin basış anındaki konumu — ızgara yapışması bunun üzerinden. */
  origin: PlanPoint
}

/**
 * Alan nesnesi seçme, taşıma ve silme — `usePointSymbolSelectionTool` ile aynı
 * sözleşme (tek yazım bırakma anında, tek Ctrl+Z). Tek fark: `moveAreaObject`
 * K35/K36 gerekçesiyle REDDEDEBİLİR (kapının üstüne taşıma) — reddedilirse
 * sürükleme sırasında GÖSTERİLEN konum store'a hiç yazılmaz, nesne eski
 * yerinde kalır (K13 deseni: kaydırılmaz, sessizce reddedilir).
 */
export function useAreaObjectSelectionTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: AreaObjectGrab | undefined

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
      useArchitectureUiStore.getState().setDraggingAreaObjects(null)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const toolId = useUiStore.getState().activeToolId
      const isEraser = toolId === ERASER_TOOL_ID
      if (toolId !== SELECTION_TOOL_ID && !isEraser) return

      // Tutamacın üstündeyse jest `useAreaObjectHandleTool`'un: boyutlandırma
      // karesi köşede durduğu için yarısı gövdenin içinde kalıyor, kontrol
      // olmasa aynı basışta hem taşıma hem boyutlandırma başlardı (K44).
      if (findSelectedAreaObjectHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Kirişin uç tutamacı da aynı gerekçeyle jesti sahipleniyor (K44 dersi).
      if (findSelectedBeamHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Ad etiketi gövdenin DIŞINDA ve serbestçe taşınabiliyor: o basış etiketin.
      if (findAreaObjectLabelAt(event.planPoint, readCameraViewport(camera).zoom)) return
      // Cihaz ad etiketi de gövdesinin DIŞINDA ve serbestçe taşınabiliyor (K138).
      if (findPointSymbolLabelAt(event.planPoint, readCameraViewport(camera).zoom)) return
      // Metin de gövdesiz ve serbest: üstüne basıldıysa jest metnin (K81).
      if (findTextLabelAtPointer(event.planPoint)) return

      const target = resolveArchitectureTarget(event.planPoint, readContext())
      if (!target || target.kind !== 'area') return

      const ui = useArchitectureUiStore.getState()
      const item = { kind: 'area', id: target.areaObjectId } as const

      if (isEraser) {
        useCadStore.getState().deleteSelection([item])
        return
      }

      // Shift seçime ekler/çıkarır; düz tıklama seçimi değiştirir ama ZATEN
      // seçiliyse korur — usePointSymbolSelectionTool ile aynı gerekçe (KK-10).
      if (event.shiftKey) {
        ui.toggleSelected(item)
        return
      }
      if (!isItemSelected(ui.selection, item)) ui.setSelection([item])

      const cad = useCadStore.getState()
      const areaObject = cad.areaObjects.find((candidate) => candidate.id === target.areaObjectId)
      if (!areaObject) return

      grab = {
        areaObjectId: areaObject.id,
        grabPoint: event.planPoint,
        origin: { x: areaObject.x, y: areaObject.y },
      }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) return

      const raw = {
        x: grab.origin.x + (event.planPoint.x - grab.grabPoint.x),
        y: grab.origin.y + (event.planPoint.y - grab.grabPoint.y),
      }
      const { zoom } = readCameraViewport(camera)
      // Ctrl ızgarayı kapatır — köşe ve sembol sürüklemesiyle aynı jest.
      const next = event.ctrlKey ? raw : getPlacementPosition(raw, zoom)

      useArchitectureUiStore.getState().setDraggingAreaObjects({
        areaObjectIds: [grab.areaObjectId],
        dxCm: next.x - grab.origin.x,
        dyCm: next.y - grab.origin.y,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { areaObjectId } = grab
      const drag = useArchitectureUiStore.getState().draggingAreaObjects
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz.
      if (!drag || (drag.dxCm === 0 && drag.dyCm === 0)) return

      const cad = useCadStore.getState()
      const areaObject = cad.areaObjects.find((candidate) => candidate.id === areaObjectId)
      if (!areaObject) return

      // Reddedilirse (kapının üstüne düşerse) hiçbir şey yazılmaz, nesne
      // görsel olarak da eski yerine döner — draggingAreaObjects zaten temizlendi.
      useCadStore
        .getState()
        .moveAreaObject(areaObjectId, areaObject.x + drag.dxCm, areaObject.y + drag.dyCm)
    }

    // Esc taşımayı iptal eder: nesne eski yerinde kalır çünkü store'a yazılmadı.
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
