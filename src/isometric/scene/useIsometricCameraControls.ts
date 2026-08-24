import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { getIsometricBasis } from '../core/isometricProjection'
import type { IsometricAngles, Vec3 } from '../core/isometricProjection'

const LEFT_BUTTON = 0
const MIDDLE_BUTTON = 1

/** Tekerlek adımı; plan görünümündeki `ZOOM_WHEEL_FACTOR` ile aynı his. */
const ZOOM_WHEEL_FACTOR = 1.1
const ZOOM_MIN = 0.02
const ZOOM_MAX = 20

/**
 * Kilitli izometrik kipin zoom ve kaydırması. `scene/useViewportControls.ts`
 * KULLANILAMAZ: o `cameraViewport.ts` üzerinden çalışıyor ve orası kamerayı
 * tepeden bakan plan kamerası varsayıp konumu `planToThree(..., CAMERA_HEIGHT_CM)`
 * ile yazıyor — izometrik kamerada bu, kamerayı bir anda plan konumuna atardı.
 *
 * Burada kameranın KENDİ bazı (right/up) kullanılıyor: ekranda ölçülen piksel
 * doğrudan dünya kaymasına çevriliyor (zoom = piksel/cm). Işın testi ya da
 * düzlem kesişimi gerekmiyor — ortografik kamerada ikisi de aynı sonucu verir.
 *
 * Serbest yörünge kipinde MOUNT EDİLMEZ: orada `<OrbitControls>` aynı olayları
 * dinliyor, ikisi birden çalışsaydı tekerlek iki kez zoom yapardı.
 */
export function useIsometricCameraControls(angles: IsometricAngles): void {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    const { right, up } = getIsometricBasis(angles)

    /** Ekran düzlemindeki (cm) kaymayı dünya vektörüne taşır. */
    const toWorld = (screenXCm: number, screenYCm: number): Vec3 => [
      right[0] * screenXCm + up[0] * screenYCm,
      right[1] * screenXCm + up[1] * screenYCm,
      right[2] * screenXCm + up[2] * screenYCm,
    ]

    let panPointerId: number | null = null
    let lastClientX = 0
    let lastClientY = 0

    const stopPanning = () => {
      if (panPointerId === null) return
      if (domElement.hasPointerCapture(panPointerId)) {
        domElement.releasePointerCapture(panPointerId)
      }
      panPointerId = null
      domElement.classList.remove('cursor-grabbing')
    }

    const handleWheel = (event: WheelEvent) => {
      // passive:false ile bağlandı — olmazsa preventDefault yok sayılır, sayfa kayar.
      event.preventDefault()

      const previousZoom = camera.zoom
      const factor = event.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR
      const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, previousZoom * factor))
      if (nextZoom === previousZoom) return

      // İmleç altındaki nokta YERİNDE kalsın: ekran merkezine göre kayma, iki
      // zoom değerindeki dünya karşılığının farkı kadar kamerayı öteler.
      // Sabit merkezli zoom, kullanıcı kenardaki bir etikete yaklaşırken onu
      // ekrandan kaçırırdı.
      const rect = domElement.getBoundingClientRect()
      const offsetXPx = event.clientX - rect.left - rect.width / 2
      // Ekranın y'si AŞAĞI büyür, kameranın `up`'ı yukarı: işaret ters.
      const offsetYPx = -(event.clientY - rect.top - rect.height / 2)
      const scale = 1 / previousZoom - 1 / nextZoom
      const [dx, dy, dz] = toWorld(offsetXPx * scale, offsetYPx * scale)

      camera.position.set(camera.position.x + dx, camera.position.y + dy, camera.position.z + dz)
      camera.zoom = nextZoom
      camera.updateProjectionMatrix()
    }

    const handlePointerDown = (event: PointerEvent) => {
      // Sol tuş sürüklemesi tutamaç/etiket taşımanın kendisi; kaydırma orta tuş
      // ya da Space'siz sol tuşun boşluğa denk gelmesi değil — karışmasın diye
      // yalnız ORTA tuş ve sağ tuş kaydırır.
      if (event.button !== MIDDLE_BUTTON && event.button !== LEFT_BUTTON) return
      if (event.button === LEFT_BUTTON && !event.altKey) return

      event.preventDefault()
      panPointerId = event.pointerId
      lastClientX = event.clientX
      lastClientY = event.clientY
      domElement.setPointerCapture(event.pointerId)
      domElement.classList.add('cursor-grabbing')
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (panPointerId !== event.pointerId) return

      const deltaXCm = (event.clientX - lastClientX) / camera.zoom
      const deltaYCm = -(event.clientY - lastClientY) / camera.zoom
      lastClientX = event.clientX
      lastClientY = event.clientY

      // Çizim imleci İZLESİN diye kamera ters yöne gider.
      const [dx, dy, dz] = toWorld(deltaXCm, deltaYCm)
      camera.position.set(camera.position.x - dx, camera.position.y - dy, camera.position.z - dz)
    }

    domElement.addEventListener('wheel', handleWheel, { passive: false })
    domElement.addEventListener('pointerdown', handlePointerDown)
    domElement.addEventListener('pointermove', handlePointerMove)
    domElement.addEventListener('pointerup', stopPanning)
    domElement.addEventListener('pointercancel', stopPanning)

    return () => {
      stopPanning()
      domElement.removeEventListener('wheel', handleWheel)
      domElement.removeEventListener('pointerdown', handlePointerDown)
      domElement.removeEventListener('pointermove', handlePointerMove)
      domElement.removeEventListener('pointerup', stopPanning)
      domElement.removeEventListener('pointercancel', stopPanning)
    }
  }, [angles, camera, domElement])
}
