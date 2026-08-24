import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { planToThree } from '../../core/coords'
import type { SolidModel } from '../../core/solidModel'
import { useUiStore } from '../../store/uiStore'

/** Boş projede bakılacak bir kütle yok; kamera bu yarıçapa göre yerleşir (cm). */
const FALLBACK_RADIUS_CM = 600

/** Kütlenin yarıçapının kaç katı uzaktan bakılır. Daha küçüğü binayı taşırıyor. */
const DISTANCE_FACTOR = 2.2

/** Bakış yönü: köşeden ve YUKARIDAN — kat ayrımı ancak eğik bakışta okunuyor. */
const DIRECTION = { x: 0.75, y: 0.55, z: 0.75 }

/** Kamera binanın tepesine değil, gövdesinin bu oranına bakar. */
const TARGET_HEIGHT_RATIO = 0.45

const FIELD_OF_VIEW_DEG = 45

type SolidCameraProps = { model: SolidModel }

type CameraPlacement = {
  position: [number, number, number]
  target: [number, number, number]
  farCm: number
}

function getPlacement(model: SolidModel): CameraPlacement {
  const bounds = model.bounds
  const centerXCm = bounds ? (bounds.minXCm + bounds.maxXCm) / 2 : 0
  const centerYCm = bounds ? (bounds.minYCm + bounds.maxYCm) / 2 : 0
  const planRadiusCm = bounds
    ? Math.max(bounds.maxXCm - bounds.minXCm, bounds.maxYCm - bounds.minYCm) / 2
    : FALLBACK_RADIUS_CM

  const lowestCm =
    model.levels.length === 0 ? 0 : Math.min(...model.levels.map((level) => level.baseCm))
  const radiusCm = Math.max(planRadiusCm, model.totalHeightCm / 2, FALLBACK_RADIUS_CM)
  const distanceCm = radiusCm * DISTANCE_FACTOR

  const targetHeightCm = lowestCm + model.totalHeightCm * TARGET_HEIGHT_RATIO
  const [targetX, targetY, targetZ] = planToThree({ x: centerXCm, y: centerYCm }, targetHeightCm)

  return {
    position: [
      targetX + distanceCm * DIRECTION.x,
      targetY + distanceCm * DIRECTION.y,
      targetZ + distanceCm * DIRECTION.z,
    ],
    target: [targetX, targetY, targetZ],
    // Uzak düzlem mesafeyle ölçekleniyor: sabit bir değer büyük projelerde
    // binanın arka yarısını kırpardı.
    farCm: distanceCm * 10,
  }
}

/**
 * Katı modelin kamerası. 2B'nin ortografik kamerası ve `useViewportControls`u
 * BURADA MOUNT EDİLMEZ — o ikili plan düzlemine kilitli (tepeden bakış, pan +
 * zoom); katı modelde yörünge gerekiyor ve derinlik ancak perspektifle okunuyor.
 *
 * Konum/hedef PROP olarak verilmez, yalnız "sıfırla" isteğinde ELLE yazılır:
 * prop olarak verilseydi her yeniden render'da (kat kapsamı, görünürlük
 * anahtarları, store'un herhangi bir yazımı) kamera başlangıç açısına geri
 * zıplar, kullanıcının döndürdüğü açı kaybolurdu.
 */
export function SolidCamera({ model }: SolidCameraProps) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const pendingSolidCameraReset = useUiStore((state) => state.pendingSolidCameraReset)
  // Varsayılan kameraya ABONE olmak şart: `makeDefault` onu bir layout
  // effect'te değiştiriyor, yani İLK render'da tuvalin ortografik kamerası hâlâ
  // varsayılan ve drei kontrolleri ona bağlı. Abonelik olmasaydı takas bu
  // bileşende yeni bir render doğurmaz, aşağıdaki istek de hiç uygulanmazdı.
  const defaultCamera = useThree((state) => state.camera)
  const { position, target, farCm } = getPlacement(model)

  // Bağımlılık listesi YOK: istek, varsayılan kamera bizimki olana kadar
  // BEKLİYOR ve ancak uygulanınca siliniyor. Erken uygulansaydı konum
  // ortografik kameraya yazılır, perspektif kamera başlangıç noktasında
  // kalırdı — Katı Model'e İLK basışta boş ekran, ikincisinde doğru görüntü.
  useEffect(() => {
    if (!pendingSolidCameraReset) return

    const controls = controlsRef.current
    if (!controls || defaultCamera !== cameraRef.current) return

    controls.object.position.set(...position)
    controls.target.set(...target)
    controls.update()
    useUiStore.getState().clearSolidCameraReset()
  })

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={FIELD_OF_VIEW_DEG} near={1} far={farCm} />
      <OrbitControls ref={controlsRef} makeDefault enableDamping={false} />
    </>
  )
}
