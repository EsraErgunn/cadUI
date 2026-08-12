import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'

/** Bu orandan küçük zoom oynamaları çizgi kalınlığında görünmez; render tetiklemez. */
const ZOOM_EPSILON_RATIO = 0.002

/**
 * Kameranın zoom'u. Zoom/pan store'da değil kamerada yaşadığı için değişimi
 * burada yokluyoruz (Grid.tsx deseni) — aynı değer çıkarsa setState aynı sayıyı
 * döndürür ve React yeniden render etmez.
 *
 * Ekran boyu SABİT kalması gereken her şey (ölçü yazısı, transform ikonu) bunu
 * okur: dünya boyu `px / zoom`, çünkü zoom = piksel/cm (knowledge/viewport.md).
 *
 * Kapsayıcıda TEK kez çağrılır: nesne başına useFrame kurulsaydı her kare nesne
 * sayısı kadar geri çağrım çalışırdı.
 *
 * `scene/` altında duruyor çünkü kamera altyapısı ortak (`cameraViewport.ts`
 * ile aynı yer); mimari ve tesisat katmanları ikisi de okuyor.
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
