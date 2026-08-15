import { Text } from '@react-three/drei'
import { useMemo } from 'react'

import { ARCHITECTURE_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { useArchitecturePoints } from './useArchitecturePoints'
import { useCameraZoom } from './useCameraZoom'
import { planToThree, type PlanPoint } from '../core/coords'
import { formatLengthMeters } from '../core/lengthFormat'
import type { Id } from '../core/model'
import { getWallsAtPoint } from '../core/wall'
import {
  buildWallInteriorPoints,
  getWallDimensionAnnotations,
  type WallDimensionAnnotation,
} from '../core/wallDimensions'
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
/** Bundan kısa bir iç ölçü yazılmaz: köşeler duvarı tümüyle yutmuştur. */
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

function WallDimensions({ isEditingOnly }: { isEditingOnly: boolean }) {
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  // Sürüklenen köşe geçici konumuyla gelir; ölçü jest boyunca canlı güncellenir.
  const points = useArchitecturePoints()
  const zoom = useCameraZoom()
  const draggingPointId = useArchitectureUiStore((state) => state.draggingPoint?.pointId)
  const draggingWallIds = useArchitectureUiStore((state) => state.draggingWall?.wallIds)
  const isOpeningDimensionsVisible = useUiStore((state) => state.isOpeningDimensionsVisible)

  // Oda çevrimi araması duvar/nokta değişmedikçe aynı sonucu verir; zoom her
  // karede oynadığı için bunu ana hesapla birlikte koşturmak boşa iş olurdu.
  const interiorPoints = useMemo(
    () => buildWallInteriorPoints(walls, points, activeFloorId),
    [walls, points, activeFloorId],
  )

  const annotations = getWallDimensionAnnotations(walls, points, openings, {
    activeFloorId,
    gapCm: LABEL_GAP_PX / zoom,
    wallIds: isEditingOnly
      ? getEditedWallIds(walls, draggingPointId, draggingWallIds)
      : undefined,
    interiorPoints,
    isOpeningVisible: isOpeningDimensionsVisible,
  })

  return (
    <group name="wall-dimension-labels">
      {annotations.flatMap((annotation) =>
        getLabelRows(annotation).map((row) => (
          <DimensionText key={row.key} row={row} kind={annotation.kind} zoom={zoom} />
        )),
      )}
    </group>
  )
}

type LabelRow = {
  key: string
  position: PlanPoint
  angleDeg: number
  lengthCm: number
}

/**
 * Bir parçanın yazılacak satırları. İç ölçü duvarın ODA tarafına, dış ölçü karşı
 * yanına düşer (K75) — konumları core hesaplıyor, burada yalnız hangisinin
 * yazılacağına karar veriliyor.
 *
 * İkisi eşitse (serbest uçlu duvar ya da iki açıklık arasında kalan parça) TEK
 * satır: aynı sayıyı duvarın iki yanına yazmak kullanıcıya "bunlar farklı" der
 * ve yalan söylerdi.
 */
function getLabelRows(annotation: WallDimensionAnnotation): LabelRow[] {
  const inner: LabelRow = {
    key: `${annotation.key}-inner`,
    position: annotation.innerPosition,
    angleDeg: annotation.angleDeg,
    lengthCm: annotation.innerLengthCm,
  }

  if (annotation.outerLengthCm - annotation.innerLengthCm < MIN_LABELED_LENGTH_CM) {
    return [inner]
  }

  const outer: LabelRow = {
    key: `${annotation.key}-outer`,
    position: annotation.outerPosition,
    angleDeg: annotation.angleDeg,
    lengthCm: annotation.outerLengthCm,
  }

  // İç ölçü sıfıra düşmüşse (köşeler duvarı yutmuş) yalnız dış ölçü yazılır.
  return annotation.innerLengthCm < MIN_LABELED_LENGTH_CM ? [outer] : [inner, outer]
}

function DimensionText({
  row,
  kind,
  zoom,
}: {
  row: LabelRow
  kind: WallDimensionAnnotation['kind']
  zoom: number
}) {
  return (
    <Text
      font={FONT_URL}
      position={planToThree(row.position, HANDLE_ELEVATION_CM)}
      // Z ekseni etrafındaki dönüş yazıyı duvara PARALEL tutar; yatırma
      // (X) önce uygulanıyor, sıra değişirse yazı düzlemden kalkar.
      rotation={[FLAT_ROTATION_X, 0, row.angleDeg * DEG_TO_RAD]}
      fontSize={LABEL_SIZE_PX / zoom}
      color={kind === 'opening' ? ARCHITECTURE_COLORS.openingDimension : ARCHITECTURE_COLORS.wall}
      anchorX="center"
      anchorY="middle"
      renderOrder={RENDER_ORDER.measurement}
      raycast={NO_RAYCAST}
    >
      {formatLengthMeters(row.lengthCm)}
    </Text>
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
