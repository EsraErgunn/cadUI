import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three'

import { useIsometricCameraControls } from './useIsometricCameraControls'
import type { IsometricBounds } from '../core/isometricModel'
import { getIsometricBasis } from '../core/isometricProjection'
import type { IsometricAngles } from '../core/isometricProjection'
import { getIsometricBoundsDiagonalCm } from '../core/isometricScene'

/**
 * Kameranın hedefe uzaklığı. `scene/Cameras.tsx`'teki `CAMERA_HEIGHT_CM`
 * KULLANILMAZ: o sabit drei `<Line worldUnits>` shader'ına bağlı ve yalnız plan
 * kamerasının sözleşmesi (knowledge/capsule-walls.md). İzometrikte `worldUnits`
 * çizgi yok — mesafe yalnız near/far aralığına girmeye yarar.
 */
const CAMERA_DISTANCE_MULTIPLIER = 3
const MIN_CAMERA_DISTANCE_CM = 20_000

/** Etiket yazısının kendi genişliği için ek pay — çerçeve kenarına yapışmasın. */
const LABEL_TEXT_ALLOWANCE_CM = 140

/**
 * Etiketler için ayrılan çerçeve payı, çizim köşegeninin oranı olarak. Etiket
 * artık kendi nesnesinin YANINDA duruyor (K167), yani gövdenin dışına yalnız
 * bir künye boyu taşıyor — eski halka yarıçapı kadar pay bırakılsaydı çizim
 * kadrajın ortasında küçücük kalırdı.
 */
const LABEL_MARGIN_RATIO = 0.08
const FRAME_PADDING = 1.06
const EMPTY_SCENE_EXTENT_CM = 1_000

const NEAR_PLANE_CM = 1

/** Serbest kipte kamera zemin düzleminin altına inmez — bina alttan görünmez. */
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.05

type IsometricCameraProps = {
  bounds: IsometricBounds | null
  angles: IsometricAngles
  isLocked: boolean
}

/** Kilitli kipte tekerlek/kaydırma; `<Canvas>` içinde çalışmak zorunda. */
function LockedCameraControls({ angles }: { angles: IsometricAngles }) {
  useIsometricCameraControls(angles)
  return null
}

/**
 * α/β'dan türetilen ortografik kamera. Ayrı bir izdüşüm hesaplanmaz: ortografik
 * kamerada kamerayı doğru yöne çevirmek ile noktaları elle izdüşürmek aynı
 * görüntüyü verir, üstelik bu yolda sahne gerçek derinlik testiyle çizilir
 * (üst kat alt katı örter).
 *
 * Kilit açıkken `<OrbitControls>` kamerayı devralır ve buradan hiç dokunulmaz —
 * iki taraf aynı kareyi yazsaydı kamera titrerdi.
 */
export function IsometricCamera({ bounds, angles, isLocked }: IsometricCameraProps) {
  const cameraRef = useRef<ThreeOrthographicCamera>(null)
  const { width, height } = useThree((state) => state.size)

  const [targetX, targetY, targetZ] = bounds?.center ?? [0, 0, 0]
  const diagonalCm = bounds ? getIsometricBoundsDiagonalCm(bounds) : EMPTY_SCENE_EXTENT_CM
  const distanceCm = Math.max(
    MIN_CAMERA_DISTANCE_CM,
    (bounds?.sizeCm ?? 0) * CAMERA_DISTANCE_MULTIPLIER,
  )

  /**
   * YÖNELİM açı değişince yeniden kurulur. Zoom BURADA yazılmaz: kullanıcı α/β
   * kaydırıcısını her oynattığında yakınlaştırması sıfırlanırdı.
   */
  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera || !isLocked) return

    const { up, forward } = getIsometricBasis(angles)
    camera.up.set(up[0], up[1], up[2])
    camera.position.set(
      targetX - forward[0] * distanceCm,
      targetY - forward[1] * distanceCm,
      targetZ - forward[2] * distanceCm,
    )
    camera.lookAt(targetX, targetY, targetZ)
  }, [angles, distanceCm, isLocked, targetX, targetY, targetZ])

  /**
   * ÇERÇEVELEME yalnız çizim ya da pencere boyu değişince. Ölçü açıdan bağımsız
   * köşegen + etiket payı: gövdeye göre sığdırılsaydı etiketler kadraj dışında
   * kalırdı ve kullanıcı çizimi görüp yazıyı göremezdi.
   */
  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera || !isLocked) return

    const labelMarginCm = diagonalCm * LABEL_MARGIN_RATIO + LABEL_TEXT_ALLOWANCE_CM
    // `<Canvas orthographic>` frustum'u PİKSEL cinsinden kurar (K1), yani zoom
    // doğrudan "kaç piksel = 1 cm" demek.
    const framedCm = Math.max((diagonalCm + labelMarginCm * 2) * FRAME_PADDING, 1)
    camera.zoom = Math.min(width / framedCm, height / framedCm)
    camera.updateProjectionMatrix()
  }, [diagonalCm, height, isLocked, width])

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        near={NEAR_PLANE_CM}
        far={distanceCm * 2}
      />
      {isLocked ? (
        <LockedCameraControls angles={angles} />
      ) : (
        <OrbitControls
          makeDefault
          enableDamping
          target={[targetX, targetY, targetZ]}
          maxPolarAngle={MAX_POLAR_ANGLE}
        />
      )}
    </>
  )
}
