import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { findSelectedAreaObjectHandle } from './useAreaObjectHandleTool'
import { findAreaObjectLabelAt } from './useAreaObjectLabelTool'
import { findSelectedBeamHandle } from './useBeamHandleTool'
import {
  resolveArchitectureTarget,
  type ArchitectureTargetContext,
} from '../core/architectureHover'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { getSelectedIds, isItemSelected } from '../core/selection'
import { getSnapToleranceCm } from '../core/snap'
import { getSymbolPose, resolveSymbolAttachment } from '../core/symbolPlacement'
import { ERASER_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

type SymbolGrab = {
  /** Taşınacak semboller: tutulan sembol seçimin parçasıysa TÜM seçim. */
  symbolIds: Id[]
  /** Basış anındaki ham imleç noktası; öteleme buna göre ölçülür. */
  grabPoint: PlanPoint
  /** Tutulan sembolün basış anındaki konumu — ızgara yapışması bunun üzerinden. */
  origin: PlanPoint
}

/**
 * Sembol seçme, taşıma ve silme. Duvar/açıklık hook'larıyla aynı sözleşme:
 * `resolveArchitectureTarget` hedef 'symbol' değilse jest hiç başlamaz
 * (knowledge/gesture-bus-precedence.md — karar geometriyle verilir).
 *
 * Sürükleme boyunca cadStore'a YAZILMAZ; tek yazım bırakma anında olur, yani
 * tek markDirty ve tek Ctrl+Z (duvar taşımanın aynısı).
 */
export function usePointSymbolSelectionTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: SymbolGrab | undefined

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
      useArchitectureUiStore.getState().setDraggingSymbols(null)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const toolId = useUiStore.getState().activeToolId
      const isEraser = toolId === ERASER_TOOL_ID
      if (toolId !== SELECTION_TOOL_ID && !isEraser) return

      const context = readContext()
      // Alan nesnesi tutamacı bir sembolün üstüne denk gelebilir; o basış
      // tutamacın, yoksa aynı jestte sembol de taşınırdı (K44).
      if (findSelectedAreaObjectHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Kirişin uç tutamacı da aynı gerekçeyle jesti sahipleniyor (K44 dersi).
      if (findSelectedBeamHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Ad etiketi gövdenin DIŞINDA ve serbestçe taşınabiliyor: o basış etiketin.
      if (findAreaObjectLabelAt(event.planPoint, readCameraViewport(camera).zoom)) return

      const target = resolveArchitectureTarget(event.planPoint, context)
      if (!target || target.kind !== 'symbol') return

      const ui = useArchitectureUiStore.getState()
      const item = { kind: 'symbol', id: target.symbolId } as const

      if (isEraser) {
        useCadStore.getState().deleteSelection([item])
        return
      }

      // Shift seçime ekler/çıkarır; düz tıklama seçimi değiştirir ama ZATEN
      // seçiliyse korur — yoksa çoklu seçimi taşımak için basılan ilk sembol
      // taşıma başlamadan seçimi tek nesneye düşürürdü (KK-10 ile aynı kural).
      if (event.shiftKey) {
        ui.toggleSelected(item)
        return
      }
      if (!isItemSelected(ui.selection, item)) ui.setSelection([item])

      const cad = useCadStore.getState()
      const symbol = cad.symbols.find((candidate) => candidate.id === target.symbolId)
      const pose = symbol && getSymbolPose(symbol, cad.walls, cad.points)
      if (!symbol || !pose) return

      const selectedIds = getSelectedIds(useArchitectureUiStore.getState().selection, 'symbol')
      grab = {
        // Sürükleme TEK sembolü taşır: bağlanma sembol başına çözülüyor (biri
        // duvara girerken öteki çıkabilir), toplu sürükleme ayrı bir karar.
        symbolIds: selectedIds.includes(symbol.id) ? [symbol.id] : [symbol.id],
        grabPoint: event.planPoint,
        origin: pose.position,
      }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) return

      const raw = {
        x: grab.origin.x + (event.planPoint.x - grab.grabPoint.x),
        y: grab.origin.y + (event.planPoint.y - grab.grabPoint.y),
      }
      const { zoom } = readCameraViewport(camera)
      // Ctrl ızgarayı kapatır — köşe ve duvar sürüklemesiyle aynı jest.
      const next = event.ctrlKey ? raw : getPlacementPosition(raw, zoom)

      useArchitectureUiStore.getState().setDraggingSymbols({
        symbolIds: grab.symbolIds,
        dxCm: next.x - grab.origin.x,
        dyCm: next.y - grab.origin.y,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { symbolIds } = grab
      const drag = useArchitectureUiStore.getState().draggingSymbols
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz.
      if (!drag || (drag.dxCm === 0 && drag.dyCm === 0)) return

      // Bırakma noktasında yeniden bağlanma çözülür: sembol duvara girmiş,
      // duvardan çıkmış ya da başka duvara geçmiş olabilir.
      const cad = useCadStore.getState()
      const symbol = cad.symbols.find((candidate) => candidate.id === symbolIds[0])
      if (!symbol) return

      const attachment = resolveSymbolAttachment(event.planPoint, symbol.type, {
        walls: cad.walls,
        points: cad.points,
        floorId: cad.activeFloorId,
      })
      useCadStore.getState().movePointSymbol(symbol.id, attachment)
    }

    // Esc taşımayı iptal eder: sembol eski yerinde kalır çünkü store'a yazılmadı.
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
