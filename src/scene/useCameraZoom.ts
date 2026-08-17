import { useFrame } from '@react-three/fiber'
import { useSyncExternalStore } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'

/** Bu orandan küçük zoom oynamaları çizgi kalınlığında görünmez; render tetiklemez. */
const ZOOM_EPSILON_RATIO = 0.002

let currentZoom = 1
const zoomListeners = new Set<() => void>()

function getZoomSnapshot(): number {
  return currentZoom
}

function subscribeToZoom(onStoreChange: () => void): () => void {
  zoomListeners.add(onStoreChange)
  return () => {
    zoomListeners.delete(onStoreChange)
  }
}

/**
 * Kamerayı kare başına TEK kez yoklar ve değişimi abonelere dağıtır.
 * `<Canvas>` içinde bir kez kurulur (SceneRoot).
 *
 * Neden modül seviyesinde tek kaynak: `useCameraZoom` eskiden çağıran her
 * bileşende kendi `useFrame`'ini ve `useState`'ini kuruyordu. 15 çağrı yeri
 * vardı, yani kare başına 15 geri çağrım ve 15 setState — zoom hiç değişmese
 * bile. Kamera zaten tek olduğu için değer de tek yerde tutulur.
 */
export function useCameraZoomTracker(): void {
  useFrame(({ camera }) => {
    if (!(camera instanceof OrthographicCamera)) return

    const next = readCameraViewport(camera).zoom
    if (Math.abs(next - currentZoom) <= currentZoom * ZOOM_EPSILON_RATIO) return

    currentZoom = next
    for (const listener of zoomListeners) listener()
  })
}

/**
 * Kameranın zoom'u. Zoom/pan store'da değil kamerada yaşadığı için değişimi
 * `useCameraZoomTracker` yokluyor; buradaki abonelik yalnız değer GERÇEKTEN
 * değiştiğinde uyanır.
 *
 * Ekran boyu SABİT kalması gereken her şey (ölçü yazısı, transform ikonu) bunu
 * okur: dünya boyu `px / zoom`, çünkü zoom = piksel/cm (knowledge/viewport.md).
 *
 * `scene/` altında duruyor çünkü kamera altyapısı ortak (`cameraViewport.ts`
 * ile aynı yer); mimari ve tesisat katmanları ikisi de okuyor.
 */
export function useCameraZoom(): number {
  return useSyncExternalStore(subscribeToZoom, getZoomSnapshot, getZoomSnapshot)
}
