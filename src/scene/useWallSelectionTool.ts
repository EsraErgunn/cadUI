import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import {
  resolveArchitectureTarget,
  type ArchitectureTargetContext,
} from '../core/architectureHover'
import type { PlanPoint } from '../core/coords'
import { pickGridLevel, snapPointToGrid } from '../core/grid'
import type { Id } from '../core/model'
import { isItemSelected } from '../core/selection'
import { getSnapToleranceCm } from '../core/snap'
import { ERASER_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

type WallGrab = {
  wallId: Id
  /** Basış anındaki ham imleç noktası; öteleme buna göre ölçülür. */
  grabPoint: PlanPoint
  /** p1'in basış anındaki konumu — ızgara yapışması bu köşe üzerinden yapılır. */
  originP1: PlanPoint
}

/**
 * Duvar seçme, taşıma ve silme. Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * Aynı pointerdown'ı köşe ve açıklık hook'ları da görüyor. Duvar en ALTTAKİ
 * nesne, dolayısıyla ikisine de yol verir: hedef köşe veya açıklıksa jest hiç
 * başlamaz. Karar `resolveArchitectureTarget` ile veriliyor — vurgunun okuduğu
 * fonksiyonun aynısı, yoksa vurgu "şunu tutarsın" der basış başkasını tutar
 * (knowledge/gesture-bus-precedence.md).
 *
 * Öteleme KATIDIR: ham fark p1'e uygulanıp ızgaraya yapıştırılıyor, aynı fark
 * iki köşeye birden gidiyor. İki köşe ayrı ayrı yapıştırılsaydı duvarın boyu ve
 * açısı sürüklerken bozulurdu.
 */
export function useWallSelectionTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: WallGrab | undefined

    const readContext = (): ArchitectureTargetContext => {
      const cad = useCadStore.getState()
      return {
        points: cad.points,
        walls: cad.walls,
        openings: cad.openings,
        floorId: cad.activeFloorId,
        toleranceCm: getSnapToleranceCm(readCameraViewport(camera).zoom),
      }
    }

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setDraggingWall(null)
    }

    const clearSelection = () => {
      useArchitectureUiStore.getState().clearSelection()
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const toolId = useUiStore.getState().activeToolId
      const isEraser = toolId === ERASER_TOOL_ID
      if (toolId !== SELECTION_TOOL_ID && !isEraser) return

      const context = readContext()
      const target = resolveArchitectureTarget(event.planPoint, context)

      // Köşe ve açıklık üstte: jest onların. Boşluk da bizim değil — çerçeve
      // seçimini useSelectionTool başlatır, seçimi o temizler.
      if (!target || target.kind !== 'wall') return

      if (isEraser) {
        useCadStore.getState().deleteWall(target.wallId)
        clearSelection()
        return
      }

      const wall = context.walls.find((candidate) => candidate.id === target.wallId)
      const originP1 = context.points.find((point) => point.id === wall?.p1Id)
      if (!wall || !originP1) return

      // Shift seçime ekler/çıkarır, düz tıklama seçimi değiştirir (KK-10).
      // Zaten seçiliyse düz tıklama seçimi KORUR: yoksa çoklu seçimi taşımak için
      // basılan ilk duvar, taşıma başlamadan seçimi tek nesneye düşürürdü.
      const ui = useArchitectureUiStore.getState()
      const item = { kind: 'wall', id: wall.id } as const
      if (event.shiftKey) {
        ui.toggleSelected(item)
      } else if (!isItemSelected(ui.selection, item)) {
        ui.setSelection([item])
      }

      grab = {
        wallId: wall.id,
        grabPoint: event.planPoint,
        originP1: { x: originP1.x, y: originP1.y },
      }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) return

      const rawP1 = {
        x: grab.originP1.x + (event.planPoint.x - grab.grabPoint.x),
        y: grab.originP1.y + (event.planPoint.y - grab.grabPoint.y),
      }
      const { zoom } = readCameraViewport(camera)
      // Ctrl ızgarayı kapatır — usePointDragTool ile aynı jest.
      const nextP1 = event.ctrlKey
        ? rawP1
        : snapPointToGrid(rawP1, pickGridLevel(zoom).minorCm)

      useArchitectureUiStore.getState().setDraggingWall({
        wallId: grab.wallId,
        dxCm: nextP1.x - grab.originP1.x,
        dyCm: nextP1.y - grab.originP1.y,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { wallId } = grab
      const drag = useArchitectureUiStore.getState().draggingWall
      endDrag()

      // Sürükleme boyunca cadStore'a hiç yazılmadı: tek yazım = tek markDirty =
      // tek Ctrl+Z. Yer değişmediyse (sadece seçmek için tıklama) hiç yazılmaz.
      if (!drag || (drag.dxCm === 0 && drag.dyCm === 0)) return
      useCadStore.getState().moveWall(wallId, drag.dxCm, drag.dyCm)
    }

    // Esc taşımayı iptal eder: duvar eski yerinde kalır çünkü store'a yazılmadı.
    const handleCancel = () => {
      endDrag()
      clearSelection()
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
    }
  }, [camera])
}
