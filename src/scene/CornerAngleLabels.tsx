import { Line, Text } from '@react-three/drei'
import { Fragment } from 'react'

import { ARCHITECTURE_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { useArchitecturePoints } from './useArchitecturePoints'
import { useCameraZoom } from './useCameraZoom'
import { formatAngleDegrees } from '../core/angleFormat'
import { planToThree } from '../core/coords'
import {
  getCornerAngleAnnotations,
  getCornerAngleMarkerPoints,
  type CornerAngleAnnotation,
} from '../core/cornerAngles'
import type { Id } from '../core/model'
import { getWallsAtPoint } from '../core/wall'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/** Ölçü etiketleriyle aynı yazı tipi; repodan gelir (CDN'e gitmez). */
const FONT_URL = '/fonts/roboto-regular.woff'

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]

/** Yazı EKRAN boyunda sabit: dünya boyu px/zoom (bkz. knowledge/viewport.md). */
const LABEL_SIZE_PX = 10
/** Yazının köşeye ekran uzaklığı: açıortay üzerinde bu kadar dışarı kaçar. */
const LABEL_OFFSET_PX = 30
/** Geometrik işaretin yarıçapı. Yazının ALTINDA kalmalı, yoksa üstüne biner. */
const MARKER_RADIUS_PX = 16
const MARKER_WIDTH_PX = 1.2

/** Açı yazısı tıklanmaz; köşe tutması saf geometriyle yapılıyor. */
const NO_RAYCAST = () => null

/**
 * Açı katmanı kapalıyken bile GEÇİCİ yazılacak köşeler: köşe sürüklenirken
 * açının canlı okunması, hizalamanın tek geri bildirimi. Duvar ölçülerindeki
 * kuralın aynısı (K73) — kalıcı katman bir tercih, düzenleme sırasındaki sayı
 * bir geri bildirim.
 */
function getEditedPointIds(
  walls: Parameters<typeof getWallsAtPoint>[1],
  draggingPointId: Id | undefined,
  draggingWallIds: readonly Id[] | undefined,
): readonly Id[] {
  if (draggingPointId !== undefined) return [draggingPointId]
  if (!draggingWallIds) return []

  // Taşınan duvarın İKİ ucu da açı değiştirir: komşular yerinde kaldığı için
  // köşe esner.
  const pointIds = new Set<Id>()
  for (const wall of walls) {
    if (!draggingWallIds.includes(wall.id)) continue
    pointIds.add(wall.p1Id)
    pointIds.add(wall.p2Id)
  }
  return [...pointIds]
}

function CornerAngles() {
  const walls = useCadStore((state) => state.walls)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  // Sürüklenen köşe geçici konumuyla gelir; açı jest boyunca canlı güncellenir.
  const points = useArchitecturePoints()
  const zoom = useCameraZoom()
  const isCornerAnglesVisible = useUiStore((state) => state.isCornerAnglesVisible)
  const draggingPointId = useArchitectureUiStore((state) => state.draggingPoint?.pointId)
  const draggingWallIds = useArchitectureUiStore((state) => state.draggingWall?.wallIds)

  const annotations = getCornerAngleAnnotations(walls, points, {
    activeFloorId,
    offsetCm: LABEL_OFFSET_PX / zoom,
    pointIds: isCornerAnglesVisible
      ? undefined
      : getEditedPointIds(walls, draggingPointId, draggingWallIds),
  })

  return (
    <group name="corner-angle-labels">
      {annotations.map((annotation) => (
        <Fragment key={annotation.key}>
          <CornerAngleMarker annotation={annotation} radiusCm={MARKER_RADIUS_PX / zoom} />
          {/* Ekran-sabit boy ölçekle veriliyor, fontSize ile değil: fontSize her
              değişiminde troika metni yeniden dizer (bkz. WallDimensionLabels). */}
          <group
            position={planToThree(annotation.position, HANDLE_ELEVATION_CM)}
            // Ölçü yazısının aksine duvara PARALEL dönmez: açı iki duvara birden
            // ait, birine hizalamak öbürüne yanlış bakardı. Yatay kalır.
            rotation={FLAT_ROTATION}
            scale={1 / zoom}
          >
            <Text
              font={FONT_URL}
              fontSize={LABEL_SIZE_PX}
              color={ARCHITECTURE_COLORS.cornerAngle}
              anchorX="center"
              anchorY="middle"
              renderOrder={RENDER_ORDER.measurement}
              raycast={NO_RAYCAST}
            >
              {formatAngleDegrees(annotation.angleDeg)}
            </Text>
          </group>
        </Fragment>
      ))}
    </group>
  )
}

/**
 * Açının geometrik gösterimi: dik açıda KARE, diğerlerinde daire dilimi yayı
 * (K78). Şekli core üretiyor; burası yalnız çiziyor.
 *
 * `worldUnits` verilmiyor — kalınlık PİKSEL cinsinden sabit kalsın, işaretin
 * kendisi zaten ekran-sabit yarıçapla çiziliyor.
 */
function CornerAngleMarker({
  annotation,
  radiusCm,
}: {
  annotation: CornerAngleAnnotation
  radiusCm: number
}) {
  const points = getCornerAngleMarkerPoints(annotation, radiusCm).map((point) =>
    planToThree(point, HANDLE_ELEVATION_CM),
  )

  return (
    <Line
      points={points}
      color={ARCHITECTURE_COLORS.cornerAngle}
      lineWidth={MARKER_WIDTH_PX}
      // Yay her karede yeniden üretiliyor (zoom değişiyor); küme dışı bırakma
      // hesabı eski sınır kutusuyla çalışıp işareti kaybettirebilir.
      frustumCulled={false}
      renderOrder={RENDER_ORDER.measurement}
      depthWrite={false}
      toneMapped={false}
      raycast={NO_RAYCAST}
    />
  )
}

/**
 * Köşelerde buluşan duvarların arasındaki açılar (Görünüm ▸ Açılar).
 * Yazı açıortay üzerinde, köşeden ekran-sabit bir uzaklıkta durur.
 *
 * Varsayılan KAPALI: planların çoğu dik açılardan oluşuyor ve her köşeye 90°
 * yazmak kalabalıktan başka bir şey getirmez. Kapalıyken de sürükleme sırasında
 * düzenlenen köşeler için çizilir.
 *
 * Kapı gövdeden ayrı bileşen: hiçbir açı çizilmeyecekse duvar/nokta aboneliği
 * ve `useFrame` (zoom yoklaması) hiç kurulmaz (`WallDimensionLabels` deseni).
 */
export function CornerAngleLabels() {
  const isCornerAnglesVisible = useUiStore((state) => state.isCornerAnglesVisible)
  const isDraggingPoint = useArchitectureUiStore((state) => state.draggingPoint !== null)
  const isDraggingWall = useArchitectureUiStore((state) => state.draggingWall !== null)

  if (!isCornerAnglesVisible && !isDraggingPoint && !isDraggingWall) return null

  return <CornerAngles />
}
