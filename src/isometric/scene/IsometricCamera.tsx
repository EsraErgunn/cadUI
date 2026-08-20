import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three'

import type { IsometricBounds } from '../core/isometricModel'
import { getIsometricBasis } from '../core/isometricProjection'
import type { IsometricAngles } from '../core/isometricProjection'
import { getIsometricScreenExtentCm } from '../core/isometricScene'

/**
 * Kameranın hedefe uzaklığı. `scene/Cameras.tsx`'teki `CAMERA_HEIGHT_CM`
 * KULLANILMAZ: o sabit drei `<Line worldUnits>` shader'ına bağlı ve yalnız plan
 * kamerasının sözleşmesi (knowledge/capsule-walls.md). İzometrikte `worldUnits`
 * çizgi yok — mesafe yalnız near/far aralığına girmeye yarar.
 */
const CAMERA_DISTANCE_MULTIPLIER = 3
const MIN_CAMERA_DISTANCE_CM = 20_000

/** Çizim çerçeveyi tam doldurmaz: etiketler kenara taşmasın. */
const FRAME_PADDING = 1.35
const EMPTY_SCENE_EXTENT_CM = 1_000

const NEAR_PLANE_CM = 1

/** Serbest kipte kamera zemin düzleminin altına inmez — bina alttan görünmez. */
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.05

type IsometricCameraProps = {
  bounds: IsometricBounds | null
  angles: IsometricAngles
  isLocked: boolean
}

/**
 * α/β'dan türetilen ortografik kamera. Ayrı bir izdüşüm hesaplanmaz: ortografik
 * kamerada kamerayı doğru yöne çevirmek ile noktaları elle izdüşürmek aynı
 * görüntüyü verir, üstelik bu yolda sahne gerçek derinlik testiyle çizilir
 * (üst kat alt katı örter).
 *
 * Kilitliyken konum/yön/zoom her değişimde YENİDEN kurulur; kilit açıkken
 * `<OrbitControls>` kamerayı devralır ve buradan hiç dokunulmaz — iki taraf
 * aynı kareyi yazsaydı kamera titrerdi.
 */
export function IsometricCamera({ bounds, angles, isLocked }: IsometricCameraProps) {
  const cameraRef = useRef<ThreeOrthographicCamera>(null)
  const { width, height } = useThree((state) => state.size)

  const target = bounds?.center ?? [0, 0, 0]
  const [targetX, targetY, targetZ] = target
  const extent = bounds
    ? getIsometricScreenExtentCm(bounds, angles)
    : { widthCm: EMPTY_SCENE_EXTENT_CM, heightCm: EMPTY_SCENE_EXTENT_CM }
  const distanceCm = Math.max(MIN_CAMERA_DISTANCE_CM, (bounds?.sizeCm ?? 0) * CAMERA_DISTANCE_MULTIPLIER)

  // Bağımlılıklar İLKEL değerler: `bounds` her sahne kurulumunda yeni bir nesne
  // olduğu için nesneye bağlansaydı kamera her karede yeniden çerçevelenir ve
  // kullanıcının kaydırması anında geri alınırdı.
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

    // `<Canvas orthographic>` frustum'u PİKSEL cinsinden kurar (K1), yani
    // zoom doğrudan "kaç piksel = 1 cm" demek.
    const widthCm = Math.max(extent.widthCm, 1) * FRAME_PADDING
    const heightCm = Math.max(extent.heightCm, 1) * FRAME_PADDING
    camera.zoom = Math.min(width / widthCm, height / heightCm)
    camera.updateProjectionMatrix()
  }, [
    angles,
    distanceCm,
    extent.heightCm,
    extent.widthCm,
    height,
    isLocked,
    targetX,
    targetY,
    targetZ,
    width,
  ])

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        near={NEAR_PLANE_CM}
        far={distanceCm * 2}
      />
      {!isLocked && (
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
