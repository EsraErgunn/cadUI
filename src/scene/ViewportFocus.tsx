import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { OrthographicCamera } from 'three'

import { readViewportSize, writeCameraViewport } from './cameraViewport'
import { fitToBounds } from '../core/viewport'
import { useUiStore } from '../store/uiStore'

/**
 * Hata listesindeki "göster"in kamera ayağı. Zoom/pan kamerada yaşadığı için
 * (bkz. cameraViewport.ts) DOM tarafı kamerayı doğrudan oynatamaz; istek
 * store'dan geçer, uygulanır ve hemen silinir.
 *
 * İstek uygulandıktan sonra silinmezse aynı hataya ikinci kez basmak hiçbir şey
 * yapmaz — kullanıcı bu arada elle kaydırmış olabilir ve geri dönebilmeli.
 */
export function ViewportFocus() {
  const camera = useThree((state) => state.camera) as OrthographicCamera
  const domElement = useThree((state) => state.gl.domElement)
  const pendingFocusBounds = useUiStore((state) => state.pendingFocusBounds)

  useEffect(() => {
    if (!pendingFocusBounds) return

    writeCameraViewport(camera, fitToBounds(pendingFocusBounds, readViewportSize(domElement)))
    useUiStore.getState().clearFocusRequest()
  }, [camera, domElement, pendingFocusBounds])

  return null
}
