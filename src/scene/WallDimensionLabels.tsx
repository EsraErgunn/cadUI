import { Text } from '@react-three/drei'

import { ARCHITECTURE_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { useArchitecturePoints } from './useArchitecturePoints'
import { useCameraZoom } from './useCameraZoom'
import { planToThree } from '../core/coords'
import { formatLengthMeters } from '../core/lengthFormat'
import type { Id } from '../core/model'
import { getWallsAtPoint } from '../core/wall'
import { getWallDimensionAnnotations } from '../core/wallDimensions'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/** RoomLabel/AreaObjectNameLabels ile aynı yazı tipi; repodan gelir (CDN'e gitmez). */
const FONT_URL = '/fonts/roboto-regular.woff'

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION_X = -Math.PI / 2

const DEG_TO_RAD = Math.PI / 180

/** Yazı EKRAN boyunda sabit: dünya boyu px/zoom (bkz. knowledge/viewport.md). */
const LABEL_SIZE_PX = 11
/** Yazı ile duvar yüzü arasındaki ekran boşluğu. */
const LABEL_GAP_PX = 9

/** Ölçü yazısı tıklanmaz; duvar tutması saf geometriyle yapılıyor. */
const NO_RAYCAST = () => null

/**
 * Ölçü katmanı kapalıyken YALNIZ düzenlenen duvarlar yazılır: tüm planı açmak,
 * kullanıcının kapattığı katmanı sürükleme boyunca geri açmak olurdu.
 */
function getEditedWallIds(
  walls: Parameters<typeof getWallsAtPoint>[1],
  draggingPointId: Id | undefined,
  draggingWallIds: readonly Id[] | undefined,
): readonly Id[] {
  if (draggingWallIds) return draggingWallIds
  if (draggingPointId === undefined) return []
  // Köşeyi paylaşan TÜM duvarlar: köşe oynayınca hepsinin boyu değişiyor.
  return getWallsAtPoint(draggingPointId, walls).map((wall) => wall.id)
}

function WallDimensions({ isEditingOnly }: { isEditingOnly: boolean }) {
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  // Sürüklenen köşe geçici konumuyla gelir; ölçü jest boyunca canlı güncellenir.
  const points = useArchitecturePoints()
  const zoom = useCameraZoom()
  const draggingPointId = useArchitectureUiStore((state) => state.draggingPoint?.pointId)
  const draggingWallIds = useArchitectureUiStore((state) => state.draggingWall?.wallIds)

  const annotations = getWallDimensionAnnotations(walls, points, openings, {
    activeFloorId,
    gapCm: LABEL_GAP_PX / zoom,
    wallIds: isEditingOnly
      ? getEditedWallIds(walls, draggingPointId, draggingWallIds)
      : undefined,
  })

  return (
    <group name="wall-dimension-labels">
      {annotations.map((annotation) => (
        <Text
          key={annotation.key}
          font={FONT_URL}
          position={planToThree(annotation.position, HANDLE_ELEVATION_CM)}
          // Z ekseni etrafındaki dönüş yazıyı duvara PARALEL tutar; yatırma
          // (X) önce uygulanıyor, sıra değişirse yazı düzlemden kalkar.
          rotation={[FLAT_ROTATION_X, 0, annotation.angleDeg * DEG_TO_RAD]}
          fontSize={LABEL_SIZE_PX / zoom}
          color={
            annotation.kind === 'opening'
              ? ARCHITECTURE_COLORS.openingDimension
              : ARCHITECTURE_COLORS.wall
          }
          anchorX="center"
          anchorY="middle"
          renderOrder={RENDER_ORDER.measurement}
          raycast={NO_RAYCAST}
        >
          {formatLengthMeters(annotation.lengthCm)}
        </Text>
      ))}
    </group>
  )
}

/**
 * Duvarların uzunluk etiketleri (Görünüm ▸ Ölçüler). Yazı duvara paralel,
 * ekseninden dik kaydırılmış ve ekran boyunda sabit.
 *
 * Açıklığı olan duvar PARÇALARINA bölünür (K73): kapı/pencerenin iki yanında
 * kalan dolu parçalar duvar renginde, açıklığın kendi genişliği mor yazılır.
 *
 * Katman kapalıyken de sürükleme sırasında düzenlenen duvarlar için çizilir —
 * tesisattaki `DraftLengthLabel` ile aynı ayrım: kalıcı kotalama bir tercih,
 * düzenleme sırasındaki sayı bir geri bildirimdir.
 *
 * Kapı gövdeden ayrı bileşen: hiçbir ölçü çizilmeyecekse duvar/nokta
 * aboneliği ve `useFrame` (zoom yoklaması) hiç kurulmaz — geriye yalnız üç
 * küçük bayrak aboneliği kalır (`LengthLabels` deseni).
 */
export function WallDimensionLabels() {
  const isDimensionsVisible = useUiStore((state) => state.isDimensionsVisible)
  const isDraggingPoint = useArchitectureUiStore((state) => state.draggingPoint !== null)
  const isDraggingWall = useArchitectureUiStore((state) => state.draggingWall !== null)

  if (isDimensionsVisible) return <WallDimensions isEditingOnly={false} />
  if (isDraggingPoint || isDraggingWall) return <WallDimensions isEditingOnly />
  return null
}
