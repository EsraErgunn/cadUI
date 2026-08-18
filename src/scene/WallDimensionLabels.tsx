import { Text } from '@react-three/drei'


import { ARCHITECTURE_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { useArchitectureDraft } from './useArchitectureDraft'
import { useCameraZoom } from './useCameraZoom'
import { planToThree } from '../core/coords'
import { formatLengthMeters } from '../core/lengthFormat'
import type { Id } from '../core/model'
import { getWallsAtPoint } from '../core/wall'
import { getWallDimensionAnnotations, type WallDimensionAnnotation } from '../core/wallDimensions'
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
/** Bundan kısa parçaya sayı yazılmaz. */
const MIN_LABELED_LENGTH_CM = 1

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

function WallDimensions() {
  const openings = useCadStore((state) => state.openings)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  // Duvar BAĞLANTISI da önizlemeden gelir: sürüklerken kopan komşu köşenin
  // klonuna bağlı görünmeli, yoksa ekrandaki ile bırakınca olan ayrışır (K102).
  const { points, walls } = useArchitectureDraft()
  const zoom = useCameraZoom()
  const draggingPointId = useArchitectureUiStore((state) => state.draggingPoint?.pointId)
  const draggingWallIds = useArchitectureUiStore((state) => state.draggingWall?.wallIds)
  const isDimensionsVisible = useUiStore((state) => state.isDimensionsVisible)
  const isOpeningDimensionsVisible = useUiStore((state) => state.isOpeningDimensionsVisible)

  const annotations = getWallDimensionAnnotations(walls, points, openings, {
    activeFloorId,
    gapCm: LABEL_GAP_PX / zoom,
    // Duvar ölçüleri kapalıyken bile SÜRÜKLENEN duvarınki geçici çıkar; kısıt o
    // zaman devreye girer. Açıklık ölçüsü bu kısıttan etkilenmez, kendi
    // anahtarına bakar (K76).
    wallIds: isDimensionsVisible
      ? undefined
      : getEditedWallIds(walls, draggingPointId, draggingWallIds),
    isOpeningVisible: isOpeningDimensionsVisible,
  })

  return (
    <group name="wall-dimension-labels">
      {annotations
        // Köşelerin yuttuğu kadar kısa parçaya sayı yazılmaz.
        .filter((annotation) => annotation.lengthCm >= MIN_LABELED_LENGTH_CM)
        .map((annotation) => (
          <DimensionText key={annotation.key} annotation={annotation} zoom={zoom} />
        ))}
    </group>
  )
}

function DimensionText({
  annotation,
  zoom,
}: {
  annotation: WallDimensionAnnotation
  zoom: number
}) {
  return (
    // Ekran-sabit boy fontSize ile DEĞİL ölçekle veriliyor: `fontSize` her
    // değiştiğinde troika metni yeniden dizip tamponları GPU'ya yeniden
    // yüklüyor, zoom sırasında her etiket için kare başına. Ölçek yalnız
    // matrisi günceller. Anchor center/middle ve iç kaydırma olmadığı için
    // sonuç birebir aynı: `LABEL_SIZE_PX * (1/zoom)`.
    <group
      position={planToThree(annotation.position, HANDLE_ELEVATION_CM)}
      // Z ekseni etrafındaki dönüş yazıyı duvara PARALEL tutar; yatırma
      // (X) önce uygulanıyor, sıra değişirse yazı düzlemden kalkar.
      rotation={[FLAT_ROTATION_X, 0, annotation.angleDeg * DEG_TO_RAD]}
      scale={1 / zoom}
    >
      <Text
        font={FONT_URL}
        fontSize={LABEL_SIZE_PX}
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
    </group>
  )
}

/**
 * Duvar ve açıklık ölçüleri. Yazı duvara paralel, ekseninden dik kaydırılmış ve
 * ekran boyunda sabit; tek sayı: duvarın eksen boyu (K95).
 *
 * İKİ BAĞIMSIZ anahtar (K76): Görünüm ▸ Ölçüler duvar parçalarını, Görünüm ▸
 * Kapı/pencere ölçüleri açıklık genişliklerini açar. Biri kapalıyken diğeri
 * çalışmaya devam eder — kullanıcı yalnız kapı/pencere ölçülerini görmek
 * isteyebilir.
 *
 * Duvar ölçüleri kapalıyken de sürükleme sırasında düzenlenen duvarlar için
 * çizilir — tesisattaki `DraftLengthLabel` ile aynı ayrım: kalıcı kotalama bir
 * tercih, düzenleme sırasındaki sayı bir geri bildirimdir.
 *
 * Kapı gövdeden ayrı bileşen: hiçbir ölçü çizilmeyecekse duvar/nokta aboneliği
 * ve `useFrame` (zoom yoklaması) hiç kurulmaz — geriye yalnız dört küçük bayrak
 * aboneliği kalır (`LengthLabels` deseni).
 */
export function WallDimensionLabels() {
  const isDimensionsVisible = useUiStore((state) => state.isDimensionsVisible)
  const isOpeningDimensionsVisible = useUiStore((state) => state.isOpeningDimensionsVisible)
  const isDraggingPoint = useArchitectureUiStore((state) => state.draggingPoint !== null)
  const isDraggingWall = useArchitectureUiStore((state) => state.draggingWall !== null)

  const isEditing = isDraggingPoint || isDraggingWall
  if (!isDimensionsVisible && !isOpeningDimensionsVisible && !isEditing) return null

  return <WallDimensions />
}
