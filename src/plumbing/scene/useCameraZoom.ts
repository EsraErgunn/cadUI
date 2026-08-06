import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from '../../scene/cameraViewport'

/** Bu orandan küçük zoom oynamaları çizgi kalınlığında görünmez; render tetiklemez. */
const ZOOM_EPSILON_RATIO = 0.002

/**
 * Kameranın zoom'u. Zoom/pan store'da değil kamerada yaşadığı için değişimi
 * burada yokluyoruz (Grid.tsx deseni) — aynı değer çıkarsa setState aynı sayıyı
 * döndürür ve React yeniden render etmez.
 *
 * Hat kapsayıcısında TEK kez çağrılır: hat başına useFrame kurulsaydı her kare
 * hat sayısı kadar geri çağrım çalışırdı.
 */
export function useCameraZoom(): number {
  const [zoom, setZoom] = useState(1)

  useFrame(({ camera }) => {
    if (!(camera instanceof OrthographicCamera)) return

    const next = readCameraViewport(camera).zoom
    setZoom((current) =>
      Math.abs(next - current) <= current * ZOOM_EPSILON_RATIO ? current : next,
    )
  })

  return zoom
}
