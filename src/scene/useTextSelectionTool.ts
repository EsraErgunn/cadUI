import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { isItemSelected } from '../core/selection'
import { findTextLabelAt } from '../core/textLabel'
import { ERASER_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

/**
 * İmlecin altındaki metin — jest SAHİPLİĞİ için. Diğer hook'lar bunu çağırıp
 * erken dönüyor (`findAreaObjectLabelAt` ile aynı sözleşme): metin hedef
 * çözümleme zincirinde olmadığı için onlar metnin üstünü "boşluk" sanıyor ve
 * çerçeve seçimi başlatıyorlardı.
 */
export function findTextLabelAtPointer(point: PlanPoint): Id | undefined {
  const cad = useCadStore.getState()
  return findTextLabelAt(point, cad.texts, cad.activeFloorId)?.id
}

/** İki basış bu süre içinde gelirse çift tık sayılır — `useRoomNameTool` ile aynı eşik. */
const DOUBLE_CLICK_WINDOW_MS = 400

type TextGrab = {
  textId: Id
  /** Basış anındaki ham imleç noktası; öteleme buna göre ölçülür. */
  grabPoint: PlanPoint
  /** Tutulan metnin basış anındaki konumu — ızgara yapışması bunun üzerinden. */
  origin: PlanPoint
}

/**
 * Metin seçme, taşıma, silme ve ÇİFT TIKLA düzenleme.
 *
 * Hedef `resolveArchitectureTarget`ten GEÇMİYOR: o sıralama duvar/açıklık/
 * sembol/alan nesnesi için kurulmuş bir öncelik zinciri ve metin oraya
 * girseydi, bir notun üstüne düşen duvarı seçmek imkânsızlaşırdı. Metin kendi
 * kutusuyla ayrı sınanıyor ve zincirden ÖNCE deneniyor — kullanıcı yazıya
 * tıkladığında yazıyı tutar (`useAreaObjectLabelTool`un jesti sahiplenmesiyle
 * aynı gerekçe).
 */
export function useTextSelectionTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: TextGrab | undefined
    let lastPressAtMs = 0
    let lastPressTextId: Id | undefined

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setDraggingTexts(null)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const toolId = useUiStore.getState().activeToolId
      const isEraser = toolId === ERASER_TOOL_ID
      if (toolId !== SELECTION_TOOL_ID && !isEraser) return

      const cad = useCadStore.getState()
      const text = findTextLabelAt(event.planPoint, cad.texts, cad.activeFloorId)
      const ui = useArchitectureUiStore.getState()

      // Boşluğa/başka nesneye tıklamak düzenlemeyi kapatır; kutunun kendi
      // native dinleyicisi zaten kaydediyor, burası yalnız durumu temizler.
      if (!text) {
        if (ui.editingTextId !== null) ui.setEditingText(null)
        return
      }

      const item = { kind: 'text', id: text.id } as const

      if (isEraser) {
        useCadStore.getState().deleteSelection([item])
        return
      }

      // Çift tık düzenlemeyi açar. Ölçüt SÜRE + AYNI NESNE: konum eşiği
      // gerekmiyor, çünkü zaten aynı metnin kutusundayız.
      const now = performance.now()
      const isDoubleClick = lastPressTextId === text.id && now - lastPressAtMs < DOUBLE_CLICK_WINDOW_MS
      lastPressAtMs = now
      lastPressTextId = text.id

      if (isDoubleClick) {
        ui.setSelection([item])
        ui.setEditingText(text.id)
        return
      }

      if (event.shiftKey) {
        ui.toggleSelected(item)
        return
      }
      if (!isItemSelected(ui.selection, item)) ui.setSelection([item])
      // Başka bir metnin kutusu açıksa kapanır: iki kutu aynı anda açılamaz.
      if (ui.editingTextId !== null && ui.editingTextId !== text.id) ui.setEditingText(null)

      grab = { textId: text.id, grabPoint: event.planPoint, origin: { x: text.x, y: text.y } }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) return

      const raw = {
        x: grab.origin.x + (event.planPoint.x - grab.grabPoint.x),
        y: grab.origin.y + (event.planPoint.y - grab.grabPoint.y),
      }
      // Ctrl ızgarayı kapatır — köşe/sembol/alan nesnesi sürüklemesiyle aynı jest.
      const next = event.ctrlKey
        ? raw
        : getPlacementPosition(raw, readCameraViewport(camera).zoom)

      useArchitectureUiStore.getState().setDraggingTexts({
        textIds: [grab.textId],
        dxCm: next.x - grab.origin.x,
        dyCm: next.y - grab.origin.y,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { textId } = grab
      const drag = useArchitectureUiStore.getState().draggingTexts
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz.
      if (!drag || (drag.dxCm === 0 && drag.dyCm === 0)) return

      useCadStore.getState().moveTextLabel(textId, drag.dxCm, drag.dyCm)
    }

    // Esc taşımayı iptal eder: metin eski yerinde kalır çünkü store'a yazılmadı.
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
