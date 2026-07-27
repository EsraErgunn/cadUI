import { OrthographicCamera } from '@react-three/drei'

import { ZOOM_DEFAULT } from '../core/viewport'

/**
 * Kamera plan düzleminin (three y = 0) bu kadar üstünde durur. Ortografik
 * kamerada yükseklik ölçeği etkilemez, yalnız near/far aralığına girmesi gerekir.
 */
export const CAMERA_HEIGHT_CM = 100_000

export function Cameras() {
  return (
    <OrthographicCamera
      makeDefault
      position={[0, CAMERA_HEIGHT_CM, 0]}
      /**
       * X ekseni etrafında −90°: kameranın baktığı yön −Y olur (tepeden bakış) ve
       * ekranda "yukarı" three −Z'ye, yani plan +Y'ye denk gelir. Bu döndürme
       * yazılmazsa kamera −Z'ye bakar ve plan düzlemini kenardan görür.
       */
      rotation={[-Math.PI / 2, 0, 0]}
      zoom={ZOOM_DEFAULT}
      near={1}
      far={CAMERA_HEIGHT_CM * 2}
    />
  )
}
