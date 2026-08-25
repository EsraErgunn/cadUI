import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport, readViewportSize, writeCameraViewport } from './cameraViewport'
import { isTypingTarget } from '../core/domEvents'
import { ZOOM_WHEEL_FACTOR, panByPixels, zoomAtCursor } from '../core/viewport'
import { useUiStore } from '../store/uiStore'


const LEFT_BUTTON = 0
const MIDDLE_BUTTON = 1

const CURSOR_CLASSES = ['cursor-normal', 'cursor-grab', 'cursor-grabbing'] as const

/**
 * Zoom (tekerlek, imleç merkezli) ve pan (orta tuş veya Space + sol tuş) — issue 2.2.
 * Kameraya doğrudan yazar; araç mantığı DEĞİLDİR, bu yüzden DrawSurface'e girmez.
 */
export function useViewportControls(): void {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let isSpaceHeld = false
    let panPointerId: number | null = null
    let lastClientX = 0
    let lastClientY = 0

    // İmleç EDİTÖRÜN KÖKÜNE yazılır, tuvale değil (K177): imleç miras
    // alındığı için palet, üst bar ve yüzen çubuk da aynı imleci görür.
    // Tuvale yazıldığında imleç çizim alanının dışına çıkar çıkmaz işletim
    // sisteminin okuna dönüyordu (kullanıcı bildirimi).
    const cursorHost = domElement.closest('[data-editor-root]') ?? domElement

    // Aynı anda tek imleç sınıfı dursun; ikisi birden olursa hangisinin kazandığı
    // Tailwind'in çıktı sırasına kalır.
    const updateCursor = () => {
      cursorHost.classList.remove(...CURSOR_CLASSES)
      if (panPointerId !== null) {
        cursorHost.classList.add('cursor-grabbing')
        return
      }
      if (isSpaceHeld || useUiStore.getState().isPanModeActive) {
        cursorHost.classList.add('cursor-grab')
        return
      }
      cursorHost.classList.add('cursor-normal')
    }
    updateCursor()

    const stopPanning = () => {
      if (panPointerId === null) return
      if (domElement.hasPointerCapture(panPointerId)) {
        domElement.releasePointerCapture(panPointerId)
      }
      panPointerId = null
      updateCursor()
    }

    const handleWheel = (event: WheelEvent) => {
      // passive:false ile bağlandı — olmazsa preventDefault yok sayılır, sayfa kayar.
      event.preventDefault()
      const rect = domElement.getBoundingClientRect()
      const cursor = { xPx: event.clientX - rect.left, yPx: event.clientY - rect.top }
      const factor = event.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR
      writeCameraViewport(
        camera,
        zoomAtCursor(readCameraViewport(camera), readViewportSize(domElement), cursor, factor),
      )
    }

    const handlePointerDown = (event: PointerEvent) => {
      // El modu = Space'in yapışkan hâli, sol tuşu aynı şekilde pan'e çevirir (K54).
      const isPanGrip = isSpaceHeld || useUiStore.getState().isPanModeActive
      const isPanRequest =
        event.button === MIDDLE_BUTTON || (event.button === LEFT_BUTTON && isPanGrip)
      if (!isPanRequest) return

      event.preventDefault()
      panPointerId = event.pointerId
      lastClientX = event.clientX
      lastClientY = event.clientY
      // Sürükleme çizim alanının dışına taşsa da olaylar gelmeye devam etsin.
      domElement.setPointerCapture(event.pointerId)
      updateCursor()
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== panPointerId) return
      const dxPx = event.clientX - lastClientX
      const dyPx = event.clientY - lastClientY
      lastClientX = event.clientX
      lastClientY = event.clientY
      writeCameraViewport(camera, panByPixels(readCameraViewport(camera), dxPx, dyPx))
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId === panPointerId) stopPanning()
    }

    // Windows/Chrome orta tuşta otomatik kaydırma imlecini açar; pointerdown'daki
    // preventDefault tek başına yetmez, auxclick de engellenmeli.
    const handleAuxClick = (event: MouseEvent) => {
      if (event.button === MIDDLE_BUTTON) event.preventDefault()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTypingTarget(event.target)) return
      event.preventDefault()
      isSpaceHeld = true
      updateCursor()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      isSpaceHeld = false
      stopPanning()
      updateCursor()
    }

    // Sekme değişince keyup gelmez; Space "basılı kalmış" görünmesin.
    const handleBlur = () => {
      isSpaceHeld = false
      stopPanning()
      updateCursor()
    }

    // El modu düğmeyle değişiyor, jestle değil: imleç bir olay beklemeden
    // güncellenmeli, yoksa kullanıcı fareyi oynatana kadar eski imleci görür.
    const unsubscribePanMode = useUiStore.subscribe(updateCursor)

    domElement.addEventListener('wheel', handleWheel, { passive: false })
    domElement.addEventListener('pointerdown', handlePointerDown)
    domElement.addEventListener('pointermove', handlePointerMove)
    domElement.addEventListener('pointerup', handlePointerUp)
    domElement.addEventListener('pointercancel', handlePointerUp)
    domElement.addEventListener('auxclick', handleAuxClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      unsubscribePanMode()
      domElement.removeEventListener('wheel', handleWheel)
      domElement.removeEventListener('pointerdown', handlePointerDown)
      domElement.removeEventListener('pointermove', handlePointerMove)
      domElement.removeEventListener('pointerup', handlePointerUp)
      domElement.removeEventListener('pointercancel', handlePointerUp)
      domElement.removeEventListener('auxclick', handleAuxClick)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      // Sınıf artık kökte: temizlik de oradan silmeli, yoksa editörden çıkıldığında
      // özel imleç sayfada asılı kalır.
      cursorHost.classList.remove(...CURSOR_CLASSES)
    }
  }, [camera, domElement])
}
