import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport, readViewportSize } from './cameraViewport'
import {
  publishDrawSurfaceCancel,
  publishDrawSurfaceEvent,
  type DrawSurfacePointerEventKey,
} from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import { isTypingTarget } from '../core/domEvents'
import { screenToWorld } from '../core/viewport'
import { isEditorReadOnly } from '../store/editorReadOnly'
import { useUiStore } from '../store/uiStore'

const MIDDLE_BUTTON = 1

export function DrawSurface() {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    // Zoom/pan ile çakışmama kuralı: orta tuş veya Space basılıyken yayın yok —
    // o jestler useViewportControls'a ait.
    let isSpaceHeld = false
    let isMiddlePanActive = false

    const toPlanPoint = (event: MouseEvent): PlanPoint => {
      const rect = domElement.getBoundingClientRect()
      const screen = { xPx: event.clientX - rect.left, yPx: event.clientY - rect.top }
      return screenToWorld(screen, readCameraViewport(camera), readViewportSize(domElement))
    }

    const publish = (key: DrawSurfacePointerEventKey, event: MouseEvent) => {
      // El modu Space'in YAPIŞKAN hâli: aynı bastırma yolundan geçiyor, ayrı
      // bir "araçları sustur" mekanizması yazılmadı (K54).
      //
      // SALT GÖRÜNTÜLEME de aynı yoldan susturuluyor: bütün araçlar — mimari,
      // tesisat, izometrik — bu tek otobüse abone, dolayısıyla buradaki tek
      // koşul çizme/seçme/taşıma/tutamaç jestlerinin HEPSİNİ kapatıyor.
      // Zoom/pan etkilenmez: onlar `useViewportControls`ta, bu otobüsün dışında.
      if (isEditorReadOnly()) return
      if (isSpaceHeld || isMiddlePanActive || useUiStore.getState().isPanModeActive) return
      publishDrawSurfaceEvent(key, {
        planPoint: toPlanPoint(event),
        button: event.button,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
      })
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === MIDDLE_BUTTON) {
        isMiddlePanActive = true
        return
      }
      publish('onPointerDown', event)
    }

    const handlePointerMove = (event: PointerEvent) => {
      publish('onPointerMove', event)
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === MIDDLE_BUTTON) {
        isMiddlePanActive = false
        return
      }
      publish('onPointerUp', event)
    }

    // pointercancel'da button -1 gelir; orta tuş bayrağı asılı kalmasın diye ayrı.
    const handlePointerCancel = (event: PointerEvent) => {
      isMiddlePanActive = false
      publish('onPointerUp', event)
    }

    // Ham olay; ne yapılacağına araçlar karar verir (kural 7).
    const handleDoubleClick = (event: MouseEvent) => {
      publish('onDoubleClick', event)
    }

    const handleContextMenu = (event: MouseEvent) => {
      // Tarayıcı menüsü açılmasın; sağ tık davranışına araçlar karar verir.
      event.preventDefault()
      publish('onContextMenu', event)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.code === 'Space') isSpaceHeld = true
      if (event.key === 'Escape') publishDrawSurfaceCancel()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') isSpaceHeld = false
    }

    // Sekme değişince keyup gelmez; Space "basılı kalmış" görünmesin.
    const handleBlur = () => {
      isSpaceHeld = false
      isMiddlePanActive = false
    }

    domElement.addEventListener('pointerdown', handlePointerDown)
    domElement.addEventListener('pointermove', handlePointerMove)
    domElement.addEventListener('pointerup', handlePointerUp)
    domElement.addEventListener('pointercancel', handlePointerCancel)
    domElement.addEventListener('dblclick', handleDoubleClick)
    domElement.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown)
      domElement.removeEventListener('pointermove', handlePointerMove)
      domElement.removeEventListener('pointerup', handlePointerUp)
      domElement.removeEventListener('pointercancel', handlePointerCancel)
      domElement.removeEventListener('dblclick', handleDoubleClick)
      domElement.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [camera, domElement])

  return null
}
